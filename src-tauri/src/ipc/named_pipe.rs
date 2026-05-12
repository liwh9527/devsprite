use std::io;
use tokio::sync::mpsc;

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
        // Windows Named Pipe implementation
        // For now, return Ok(()) as placeholder
        // Full implementation requires windows crate
        Ok(())
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
