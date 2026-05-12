use std::io;
use tokio::sync::mpsc;
use windows::core::PCWSTR;
use windows::Win32::Foundation::*;
use windows::Win32::Storage::FileSystem::*;
use windows::Win32::System::Pipes::*;

pub struct NamedPipeListener {
    pipe_name: String,
}

impl NamedPipeListener {
    pub fn new(pipe_name: &str) -> Self {
        Self {
            pipe_name: pipe_name.to_string(),
        }
    }

    pub fn full_pipe_name(&self) -> String {
        format!(r"\\.\pipe\{}", self.pipe_name)
    }

    pub async fn start_listening(
        &self,
        tx: mpsc::Sender<String>,
    ) -> io::Result<()> {
        let pipe_name = self.full_pipe_name();
        tokio::task::spawn_blocking(move || Self::listen_loop(&pipe_name, tx))
            .await
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e))?
    }

    fn listen_loop(pipe_name: &str, tx: mpsc::Sender<String>) -> io::Result<()> {
        let pipe_name_wide: Vec<u16> = pipe_name
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect();
        let pcwstr = PCWSTR::from_raw(pipe_name_wide.as_ptr());

        loop {
            unsafe {
                let handle = CreateNamedPipeW(
                    pcwstr,
                    PIPE_ACCESS_INBOUND,
                    PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
                    1,
                    0,
                    4096,
                    0,
                    None,
                );

                if handle.is_invalid() {
                    return Err(io::Error::last_os_error());
                }

                if ConnectNamedPipe(handle, None).is_err() {
                    DisconnectNamedPipe(handle).ok();
                    CloseHandle(handle).ok();
                    continue;
                }

                let mut buffer = [0u8; 4096];
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
                            if tx.blocking_send(msg.to_string()).is_err() {
                                break;
                            }
                        }
                        Err(_) => break,
                    }
                }

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
    }
}
