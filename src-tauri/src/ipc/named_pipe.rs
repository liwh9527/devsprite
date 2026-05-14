use std::io;
use tokio::sync::mpsc;
use windows::core::PCWSTR;
use windows::Win32::Foundation::*;
use windows::Win32::Storage::FileSystem::*;
use windows::Win32::System::Pipes::*;

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

    pub async fn start_listening(
        &self,
        tx: mpsc::Sender<String>,
    ) -> io::Result<()> {
        let pipe_name = self.full_pipe_name();
        let buffer_size = self.buffer_size;
        let max_retries = self.max_retries;
        tokio::task::spawn_blocking(move || Self::listen_loop(&pipe_name, tx, buffer_size, max_retries))
            .await
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?
    }

    fn listen_loop(pipe_name: &str, tx: mpsc::Sender<String>, buffer_size: usize, max_retries: u32) -> io::Result<()> {
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
                        pipe_handle = unsafe {
                            CreateNamedPipeW(
                                pcwstr,
                                PIPE_ACCESS_INBOUND,
                                PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
                                1,
                                0,
                                buffer_size as u32,
                                0,
                                None,
                            )
                        };

                        if !pipe_handle.is_invalid() {
                            break;
                        }

                        let err = io::Error::last_os_error();
                        retries += 1;

                        if retries > max_retries {
                            log::error!("Failed to create pipe after {} retries: {}", max_retries, err);
                            return Err(err);
                        }

                        log::warn!("Pipe creation failed (attempt {}/{}), retrying in {:?}: {}",
                            retries, max_retries, delay, err);
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

                log::info!("Client connected, reading data...");

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
                                String::from_utf8_lossy(&buffer[..bytes_read as usize]);
                            log::info!("Received: {}", &msg[..msg.len().min(100)]);
                            if tx.blocking_send(msg.to_string()).is_err() {
                                break;
                            }
                        }
                        Err(_) => break,
                    }
                }

                log::info!("Client disconnected");
                DisconnectNamedPipe(handle).ok();
                CloseHandle(handle).ok();
            }
        }
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
}
