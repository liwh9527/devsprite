use std::io;
use std::sync::atomic::{AtomicU64, Ordering};
use tokio::sync::{mpsc, oneshot};
use windows::core::PCWSTR;
use windows::Win32::Foundation::*;
use windows::Win32::Storage::FileSystem::*;
use windows::Win32::System::Pipes::*;

use crate::ipc::events::DevSpriteEvent;

/// Monotonically increasing counter for generating unique permission request IDs.
static PERMISSION_COUNTER: AtomicU64 = AtomicU64::new(0);

fn generate_request_id() -> String {
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let seq = PERMISSION_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("perm-{}-{}", ts, seq)
}

/// A pending permission request waiting for user response.
///
/// The reader thread creates a oneshot channel and sends the sender half
/// to the main event loop. When the user responds in the UI, the command
/// handler sends the response through the oneshot, and the reader thread
/// writes it back to the pipe client (the hook script).
pub struct PendingPermission {
    pub request_id: String,
    pub session_id: String,
    pub response_tx: oneshot::Sender<String>,
}

pub struct NamedPipeListener {
    pipe_name: String,
    buffer_size: usize,
    max_retries: u32,
}

impl NamedPipeListener {
    pub fn new(pipe_name: &str) -> Self {
        Self {
            pipe_name: pipe_name.to_string(),
            buffer_size: 4096,
            max_retries: 3,
        }
    }

    pub fn with_buffer_size(pipe_name: &str, buffer_size: usize) -> Self {
        Self {
            pipe_name: pipe_name.to_string(),
            buffer_size,
            max_retries: 3,
        }
    }

    pub fn with_max_retries(mut self, max_retries: u32) -> Self {
        self.max_retries = max_retries;
        self
    }

    pub fn full_pipe_name(&self) -> String {
        format!(r"\\.\pipe\{}", self.pipe_name)
    }

    /// Starts the named pipe listener.
    ///
    /// Returns two channels:
    /// - `event_tx/rx`: General event messages (all event types)
    /// - `pending_tx/rx`: Pending permission requests that need pipe-based responses
    pub async fn start_listening(
        &self,
        event_tx: mpsc::Sender<String>,
        pending_tx: mpsc::Sender<PendingPermission>,
    ) -> io::Result<()> {
        let pipe_name = self.full_pipe_name();
        let buffer_size = self.buffer_size;
        let max_retries = self.max_retries;
        tokio::task::spawn_blocking(move || {
            Self::listen_loop(&pipe_name, event_tx, pending_tx, buffer_size, max_retries)
        })
        .await
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?
    }

    fn listen_loop(
        pipe_name: &str,
        event_tx: mpsc::Sender<String>,
        pending_tx: mpsc::Sender<PendingPermission>,
        buffer_size: usize,
        max_retries: u32,
    ) -> io::Result<()> {
        let pipe_name_wide: Vec<u16> = pipe_name
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let pcwstr = PCWSTR::from_raw(pipe_name_wide.as_ptr());

        log::info!("Named Pipe listener starting on: {}", pipe_name);

        loop {
            unsafe {
                let handle = {
                    let mut retries = 0u32;
                    let mut delay = std::time::Duration::from_secs(1);
                    let mut pipe_handle;

                    loop {
                        // DUPLEX mode: supports both fire-and-forget events (client writes only)
                        // and permission requests (client writes, then reads response).
                        pipe_handle = CreateNamedPipeW(
                            pcwstr,
                            PIPE_ACCESS_DUPLEX,
                            PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
                            255, // PIPE_UNLIMITED_INSTANCES
                            0,
                            buffer_size as u32,
                            0,
                            None,
                        );

                        if !pipe_handle.is_invalid() {
                            break;
                        }

                        let err = io::Error::last_os_error();
                        retries += 1;

                        if retries > max_retries {
                            log::error!(
                                "Failed to create pipe after {} retries: {}",
                                max_retries,
                                err
                            );
                            return Err(err);
                        }

                        log::warn!(
                            "Pipe creation failed (attempt {}/{}), retrying in {:?}: {}",
                            retries,
                            max_retries,
                            delay,
                            err
                        );
                        std::thread::sleep(delay);
                        delay = delay.saturating_mul(2);
                    }

                    pipe_handle
                };

                log::info!("Pipe created, waiting for connection...");

                if ConnectNamedPipe(handle, None).is_err() {
                    log::warn!("ConnectNamedPipe failed, disconnecting");
                    DisconnectNamedPipe(handle).ok();
                    CloseHandle(handle).ok();
                    continue;
                }

                log::info!("Client connected, spawning reader thread...");

                let event_tx_clone = event_tx.clone();
                let pending_tx_clone = pending_tx.clone();
                // Convert HANDLE to usize for safe cross-thread transfer (*mut c_void is !Send).
                // Safety: pipe HANDLEs are kernel objects usable from any thread.
                let raw = handle.0 as usize;
                std::thread::spawn(move || {
                    let handle = HANDLE(raw as *mut std::ffi::c_void);
                    let mut buffer = vec![0u8; buffer_size];
                    let mut bytes_read = 0u32;

                    loop {
                        let success = ReadFile(
                            handle,
                            Some(&mut buffer),
                            Some(&mut bytes_read),
                            None,
                        );

                        match success {
                            Ok(()) if bytes_read == 0 => break,
                            Ok(()) => {
                                let msg =
                                    String::from_utf8_lossy(&buffer[..bytes_read as usize])
                                        .to_string();
                                log::info!("Received: {}", &msg[..msg.len().min(100)]);

                                // Check if this is a permission_request that needs
                                // bidirectional pipe communication.
                                if let Ok(event) =
                                    serde_json::from_str::<DevSpriteEvent>(&msg)
                                {
                                    if event.event == "permission_request" {
                                        handle_permission_request(
                                            &event_tx_clone,
                                            &pending_tx_clone,
                                            handle,
                                            &event,
                                            &msg,
                                        );
                                        // Permission request handled; this connection is done.
                                        break;
                                    }
                                }

                                // Non-permission event: fire-and-forget.
                                if event_tx_clone.blocking_send(msg).is_err() {
                                    break;
                                }
                            }
                            Err(_) => break,
                        }
                    }

                    log::info!("Client disconnected");
                    DisconnectNamedPipe(handle).ok();
                    CloseHandle(handle).ok();
                });
            }
        }
    }
}

/// Handles a permission_request event with bidirectional pipe communication.
///
/// 1. Generates a unique request_id and stores the oneshot sender in pending_tx.
/// 2. Emits the event (with request_id) to the frontend via event_tx.
/// 3. Blocks waiting for the user's response via the oneshot receiver.
/// 4. Writes the response back to the pipe client (hook script).
/// 5. On any failure, writes a fail-open response (`{"approved": true}`).
fn handle_permission_request(
    event_tx: &mpsc::Sender<String>,
    pending_tx: &mpsc::Sender<PendingPermission>,
    handle: HANDLE,
    event: &DevSpriteEvent,
    raw_msg: &str,
) {
    let request_id = generate_request_id();
    let session_id = event.session_id.clone();

    // Create oneshot channel for the response.
    let (resp_tx, resp_rx) = oneshot::channel::<String>();

    let pending = PendingPermission {
        request_id: request_id.clone(),
        session_id,
        response_tx: resp_tx,
    };

    // Try to register the pending permission.
    if pending_tx.blocking_send(pending).is_err() {
        log::warn!(
            "Pending permission channel full/closed, writing fail-open for {}",
            request_id
        );
        write_pipe_response(handle, r#"{"approved": true}"#);
        return;
    }

    // Inject request_id into the event data so the frontend can correlate responses.
    let mut event_with_id = event.clone();
    if let serde_json::Value::Object(ref mut map) = event_with_id.data {
        map.insert(
            "request_id".to_string(),
            serde_json::Value::String(request_id.clone()),
        );
    }
    let msg_with_id = serde_json::to_string(&event_with_id).unwrap_or_else(|_| raw_msg.to_string());

    if event_tx.blocking_send(msg_with_id).is_err() {
        log::warn!("Event channel closed, writing fail-open for {}", request_id);
        write_pipe_response(handle, r#"{"approved": true}"#);
        return;
    }

    // Block waiting for the user's response from the UI.
    log::info!("Waiting for permission response ({})...", request_id);
    match resp_rx.blocking_recv() {
        Ok(response) => {
            log::info!(
                "Permission response received for {}: {}",
                request_id,
                &response[..response.len().min(100)]
            );
            write_pipe_response(handle, &response);
        }
        Err(_) => {
            // oneshot sender dropped (e.g. pending store cleared) — fail-open.
            log::warn!(
                "Permission response channel closed for {}, writing fail-open",
                request_id
            );
            write_pipe_response(handle, r#"{"approved": true}"#);
        }
    }
}

/// Writes a UTF-8 string to the pipe handle.
fn write_pipe_response(handle: HANDLE, data: &str) {
    let mut bytes_written = 0u32;
    let write_result = unsafe {
        WriteFile(
            handle,
            Some(data.as_bytes()),
            Some(&mut bytes_written),
            None,
        )
    };
    if let Err(e) = write_result {
        log::warn!("Failed to write pipe response: {:?}", e);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pipe_name_format() {
        let listener = NamedPipeListener::new("devsprite");
        assert_eq!(listener.full_pipe_name(), r"\\.\pipe\devsprite");
        assert_eq!(listener.buffer_size, 4096);
        assert_eq!(listener.max_retries, 3);
    }

    #[test]
    fn test_with_buffer_size() {
        let listener = NamedPipeListener::with_buffer_size("custom", 8192);
        assert_eq!(listener.full_pipe_name(), r"\\.\pipe\custom");
        assert_eq!(listener.buffer_size, 8192);
        assert_eq!(listener.max_retries, 3);
    }

    #[test]
    fn test_with_max_retries() {
        let listener = NamedPipeListener::new("test").with_max_retries(5);
        assert_eq!(listener.max_retries, 5);
    }

    #[test]
    fn test_generate_request_id_unique() {
        let id1 = generate_request_id();
        let id2 = generate_request_id();
        assert_ne!(id1, id2);
        assert!(id1.starts_with("perm-"));
        assert!(id2.starts_with("perm-"));
    }
}
