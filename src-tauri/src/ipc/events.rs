use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevSpriteEvent {
    pub event: String,
    pub timestamp: String,
    pub session_id: String,
    pub data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallData {
    pub tool_name: String,
    pub file_path: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionRequestData {
    pub operation: String,
    pub target: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusChangeData {
    pub status: String,
    pub message: String,
}

impl DevSpriteEvent {
    pub fn parse(json_str: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json_str)
    }

    pub fn parse_tool_call(&self) -> Result<ToolCallData, serde_json::Error> {
        serde_json::from_value(self.data.clone())
    }

    pub fn parse_permission_request(&self) -> Result<PermissionRequestData, serde_json::Error> {
        serde_json::from_value(self.data.clone())
    }

    pub fn parse_status_change(&self) -> Result<StatusChangeData, serde_json::Error> {
        serde_json::from_value(self.data.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_valid_event() {
        let json = r#"{
            "event": "tool_call",
            "timestamp": "2026-05-12T10:30:00Z",
            "session_id": "abc123",
            "data": {
                "tool_name": "Read",
                "file_path": "/path/to/file.rs",
                "status": "completed"
            }
        }"#;

        let event = DevSpriteEvent::parse(json).unwrap();
        assert_eq!(event.event, "tool_call");
        assert_eq!(event.session_id, "abc123");

        let tool_call = event.parse_tool_call().unwrap();
        assert_eq!(tool_call.tool_name, "Read");
        assert_eq!(tool_call.file_path, "/path/to/file.rs");
    }

    #[test]
    fn test_parse_invalid_json() {
        let json = "invalid json";
        let result = DevSpriteEvent::parse(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_missing_required_field() {
        let json = r#"{"timestamp": "2026-05-12T10:30:00Z"}"#;
        let result = DevSpriteEvent::parse(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_tool_call_type_mismatch() {
        let json = r#"{
            "event": "tool_call",
            "timestamp": "2026-05-12T10:30:00Z",
            "session_id": "abc123",
            "data": {
                "status": "idle",
                "message": "wrong data type"
            }
        }"#;
        let event = DevSpriteEvent::parse(json).unwrap();
        let result = event.parse_tool_call();
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_permission_request() {
        let json = r#"{
            "event": "permission_request",
            "timestamp": "2026-05-12T10:30:00Z",
            "session_id": "sess1",
            "data": {
                "operation": "Read",
                "target": "/secret/file",
                "reason": "needs access"
            }
        }"#;
        let event = DevSpriteEvent::parse(json).unwrap();
        assert_eq!(event.event, "permission_request");
        let perm = event.parse_permission_request().unwrap();
        assert_eq!(perm.operation, "Read");
        assert_eq!(perm.target, "/secret/file");
        assert_eq!(perm.reason, "needs access");
    }

    #[test]
    fn test_parse_session_start_minimal() {
        let json = r#"{
            "event": "session_start",
            "timestamp": "2026-05-12T10:30:00Z",
            "session_id": "sess-minimal",
            "data": {}
        }"#;
        let event = DevSpriteEvent::parse(json).unwrap();
        assert_eq!(event.event, "session_start");
        assert_eq!(event.session_id, "sess-minimal");
    }

    #[test]
    fn test_parse_status_change() {
        let json = r#"{
            "event": "status_change",
            "timestamp": "2026-05-12T10:30:00Z",
            "session_id": "sess1",
            "data": {
                "status": "error",
                "message": "connection lost"
            }
        }"#;
        let event = DevSpriteEvent::parse(json).unwrap();
        let status = event.parse_status_change().unwrap();
        assert_eq!(status.status, "error");
        assert_eq!(status.message, "connection lost");
    }
}
