use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionResponse {
    pub request_id: String,
    pub session_id: String,
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn create_test_store() -> ResponseStore {
        let temp_dir = env::temp_dir().join("devsprite_test_responses");
        let _ = fs::create_dir_all(&temp_dir);

        let store_path = temp_dir.join("responses.json");

        ResponseStore {
            store_path,
            pending_responses: Mutex::new(Vec::new()),
        }
    }

    #[test]
    fn test_store_response() {
        let store = create_test_store();
        let response = PermissionResponse {
            request_id: "req1".to_string(),
            session_id: "sess1".to_string(),
            approved: true,
            timestamp: 1000,
        };

        store.store_response(response).unwrap();

        let pending = store.get_pending_responses();
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].request_id, "req1");
        assert_eq!(pending[0].approved, true);
    }

    #[test]
    fn test_get_pending_responses() {
        let store = create_test_store();
        assert!(store.get_pending_responses().is_empty());

        store.store_response(PermissionResponse {
            request_id: "req1".to_string(),
            session_id: "sess1".to_string(),
            approved: true,
            timestamp: 1000,
        }).unwrap();
        store.store_response(PermissionResponse {
            request_id: "req2".to_string(),
            session_id: "sess1".to_string(),
            approved: false,
            timestamp: 2000,
        }).unwrap();

        let pending = store.get_pending_responses();
        assert_eq!(pending.len(), 2);
    }

    #[test]
    fn test_clear_response() {
        let store = create_test_store();
        store.store_response(PermissionResponse {
            request_id: "req1".to_string(),
            session_id: "sess1".to_string(),
            approved: true,
            timestamp: 1000,
        }).unwrap();
        store.store_response(PermissionResponse {
            request_id: "req2".to_string(),
            session_id: "sess1".to_string(),
            approved: false,
            timestamp: 2000,
        }).unwrap();

        store.clear_response("req1").unwrap();

        let pending = store.get_pending_responses();
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].request_id, "req2");
    }

    #[test]
    fn test_load_from_disk() {
        let store = create_test_store();
        store.store_response(PermissionResponse {
            request_id: "req1".to_string(),
            session_id: "sess1".to_string(),
            approved: true,
            timestamp: 1000,
        }).unwrap();

        // Create a new store pointing to the same path
        let store2 = ResponseStore {
            store_path: store.store_path.clone(),
            pending_responses: Mutex::new(Vec::new()),
        };

        store2.load_from_disk().unwrap();
        let pending = store2.get_pending_responses();
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].request_id, "req1");
    }

    #[test]
    fn test_load_from_disk_empty_file() {
        let temp_dir = env::temp_dir().join("devsprite_test_empty");
        let _ = fs::create_dir_all(&temp_dir);
        let store_path = temp_dir.join("responses.json");

        let store = ResponseStore {
            store_path,
            pending_responses: Mutex::new(Vec::new()),
        };

        // File doesn't exist - should succeed with empty state
        store.load_from_disk().unwrap();
        assert!(store.get_pending_responses().is_empty());
    }
}

