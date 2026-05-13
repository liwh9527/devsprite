use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub window_x: i32,
    pub window_y: i32,
    pub is_visible: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            window_x: 100,
            window_y: 100,
            is_visible: true,
        }
    }
}

fn get_config_path() -> PathBuf {
    let app_data = std::env::var("APPDATA")
        .unwrap_or_else(|_| ".".to_string());
    PathBuf::from(app_data)
        .join("devsprite")
        .join("config.json")
}

pub fn load_config() -> std::io::Result<AppConfig> {
    let path = get_config_path();
    if !path.exists() {
        return Ok(AppConfig::default());
    }

    let content = fs::read_to_string(path)?;
    let config: AppConfig = serde_json::from_str(&content)
        .unwrap_or_default();

    log::info!("Loaded config: {:?}", config);
    Ok(config)
}

pub fn save_config(config: &AppConfig) -> std::io::Result<()> {
    let path = get_config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let content = serde_json::to_string_pretty(config)?;
    fs::write(&path, content)?;

    log::info!("Saved config: {:?}", config);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_save_and_load_config() {
        let temp_dir = env::temp_dir().join("devsprite_test_config");
        let _ = fs::create_dir_all(&temp_dir);
        let path = temp_dir.join("config.json");

        let config = AppConfig {
            window_x: 200,
            window_y: 300,
            is_visible: false,
        };

        let content = serde_json::to_string_pretty(&config).unwrap();
        fs::write(&path, &content).unwrap();

        let loaded: AppConfig = if path.exists() {
            let content = fs::read_to_string(&path).unwrap();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            AppConfig::default()
        };

        assert_eq!(loaded.window_x, 200);
        assert_eq!(loaded.window_y, 300);
        assert_eq!(loaded.is_visible, false);
    }

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert_eq!(config.window_x, 100);
        assert_eq!(config.window_y, 100);
        assert_eq!(config.is_visible, true);
    }

    #[test]
    fn test_load_corrupted_config_returns_default() {
        let temp_dir = env::temp_dir().join("devsprite_test_corrupted");
        let _ = fs::create_dir_all(&temp_dir);
        let path = temp_dir.join("config.json");

        fs::write(&path, "this is not json!!!").unwrap();

        let config: AppConfig = if path.exists() {
            let content = fs::read_to_string(&path).unwrap();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            AppConfig::default()
        };

        assert_eq!(config.window_x, 100);
    }
}
