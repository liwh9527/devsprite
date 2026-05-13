use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionResponse {
    pub request_id: String,
    pub approved: bool,
    pub timestamp: i64,
}

pub struct ResponseStore {
    store_path: PathBuf,
    pending_responses: Mutex<Vec<PermissionResponse>>,
}

impl ResponseStore {
    pub fn new() -> std::io::Result<Self> {
        let app_data = std::env::var("APPDATA")
            .unwrap_or_else(|_| ".".to_string());
        let store_dir = PathBuf::from(app_data).join("devsprite");
        fs::create_dir_all(&store_dir)?;

        let store_path = store_dir.join("responses.json");

        Ok(Self {
            store_path,
            pending_responses: Mutex::new(Vec::new()),
        })
    }

    pub fn store_response(&self, response: PermissionResponse) -> std::io::Result<()> {
        let mut responses = self.pending_responses.lock().unwrap();
        responses.push(response.clone());

        let content = serde_json::to_string_pretty(&*responses)?;
        fs::write(&self.store_path, content)?;

        log::info!("Stored permission response: {:?}", response);
        Ok(())
    }

    pub fn get_pending_responses(&self) -> Vec<PermissionResponse> {
        self.pending_responses.lock().unwrap().clone()
    }

    pub fn clear_response(&self, request_id: &str) -> std::io::Result<()> {
        let mut responses = self.pending_responses.lock().unwrap();
        responses.retain(|r| r.request_id != request_id);

        let content = serde_json::to_string_pretty(&*responses)?;
        fs::write(&self.store_path, content)?;

        Ok(())
    }

    pub fn load_from_disk(&self) -> std::io::Result<()> {
        if self.store_path.exists() {
            let content = fs::read_to_string(&self.store_path)?;
            let responses: Vec<PermissionResponse> = serde_json::from_str(&content)?;
            let mut pending = self.pending_responses.lock().unwrap();
            *pending = responses;
        }
        Ok(())
    }
}

impl Default for ResponseStore {
    fn default() -> Self {
        Self::new().expect("Failed to create ResponseStore")
    }
}
