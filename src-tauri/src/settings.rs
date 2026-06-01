use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// ---------------------------------------------------------------------------
// Sub-structs
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSettings {
    pub x: i32,
    pub y: i32,
    pub visible: bool,
    pub width: i32,
    pub height: i32,
}

impl Default for WindowSettings {
    fn default() -> Self {
        Self {
            x: 100,
            y: 100,
            visible: true,
            width: 220,
            height: 400,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipeSettings {
    pub name: String,
    pub buffer_size: usize,
    pub connect_timeout: u32,
    pub max_retries: u32,
}

impl Default for PipeSettings {
    fn default() -> Self {
        Self {
            name: "devsprite".to_string(),
            buffer_size: 4096,
            connect_timeout: 3000,
            max_retries: 3,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeSettings {
    pub primary_color: String,
    pub primary_dark_color: String,
    pub panel_width: u32,
    pub panel_background_opacity: f64,
    pub panel_border_radius: u32,
}

impl Default for ThemeSettings {
    fn default() -> Self {
        Self {
            primary_color: "#667eea".to_string(),
            primary_dark_color: "#764ba2".to_string(),
            panel_width: 200,
            panel_background_opacity: 0.95,
            panel_border_radius: 12,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BehaviorSettings {
    pub max_tool_calls: u32,
    pub permission_timeout: u32,
    pub hotkey: String,
    #[serde(default)]
    pub auto_launch: bool,
    #[serde(default = "default_sound_enabled")]
    pub sound_enabled: bool,
    #[serde(default = "default_sound_volume")]
    pub sound_volume: u32,
}

fn default_sound_enabled() -> bool {
    true
}

fn default_sound_volume() -> u32 {
    80
}

impl Default for BehaviorSettings {
    fn default() -> Self {
        Self {
            max_tool_calls: 5,
            permission_timeout: 30,
            hotkey: "Ctrl+Shift+D".to_string(),
            auto_launch: false,
            sound_enabled: true,
            sound_volume: 80,
        }
    }
}

// ---------------------------------------------------------------------------
// Unified Settings
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub window: WindowSettings,
    pub pipe: PipeSettings,
    pub theme: ThemeSettings,
    pub behavior: BehaviorSettings,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            window: WindowSettings::default(),
            pipe: PipeSettings::default(),
            theme: ThemeSettings::default(),
            behavior: BehaviorSettings::default(),
        }
    }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

#[derive(Debug, PartialEq)]
pub enum ValidationError {
    InvalidColor(String),
    InvalidColorLength(String),
    PanelWidthOutOfRange(u32),
    PanelBackgroundOpacityOutOfRange(f64),
    PanelBorderRadiusOutOfRange(u32),
    MaxToolCallsOutOfRange(u32),
    PermissionTimeoutOutOfRange(u32),
    BufferSizeOutOfRange(usize),
    ConnectTimeoutOutOfRange(u32),
    HotkeyEmpty,
    MaxRetriesOutOfRange(u32),
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidColor(v) => write!(f, "Invalid color format (must start with '#'): {}", v),
            Self::InvalidColorLength(v) => {
                write!(f, "Invalid color length (must be 7 chars including '#'): {}", v)
            }
            Self::PanelWidthOutOfRange(v) => write!(f, "Panel width out of range (160-300): {}", v),
            Self::PanelBackgroundOpacityOutOfRange(v) => {
                write!(f, "Panel background opacity out of range (0.5-1.0): {}", v)
            }
            Self::PanelBorderRadiusOutOfRange(v) => {
                write!(f, "Panel border radius out of range (0-24): {}", v)
            }
            Self::MaxToolCallsOutOfRange(v) => {
                write!(f, "Max tool calls out of range (3-10): {}", v)
            }
            Self::PermissionTimeoutOutOfRange(v) => {
                write!(f, "Permission timeout out of range (5-60): {}", v)
            }
            Self::BufferSizeOutOfRange(v) => {
                write!(f, "Buffer size out of range (1024-65536): {}", v)
            }
            Self::ConnectTimeoutOutOfRange(v) => {
                write!(f, "Connect timeout out of range (1000-10000): {}", v)
            }
            Self::HotkeyEmpty => write!(f, "Hotkey cannot be empty"),
            Self::MaxRetriesOutOfRange(v) => {
                write!(f, "Max retries out of range (1-10): {}", v)
            }
        }
    }
}

impl std::error::Error for ValidationError {}

fn validate_color(color: &str) -> Result<(), ValidationError> {
    if !color.starts_with('#') {
        return Err(ValidationError::InvalidColor(color.to_string()));
    }
    if color.len() != 7 {
        return Err(ValidationError::InvalidColorLength(color.to_string()));
    }
    Ok(())
}

impl Settings {
    /// Validates all settings fields and returns a list of validation errors.
    /// Returns Ok(()) if all fields are valid.
    pub fn validate(&self) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();

        // Color validations
        if let Err(e) = validate_color(&self.theme.primary_color) {
            errors.push(e);
        }
        if let Err(e) = validate_color(&self.theme.primary_dark_color) {
            errors.push(e);
        }

        // Numeric range validations
        if !(160..=300).contains(&self.theme.panel_width) {
            errors.push(ValidationError::PanelWidthOutOfRange(self.theme.panel_width));
        }
        if !(0.5..=1.0).contains(&self.theme.panel_background_opacity) {
            errors.push(ValidationError::PanelBackgroundOpacityOutOfRange(
                self.theme.panel_background_opacity,
            ));
        }
        if !(0..=24).contains(&self.theme.panel_border_radius) {
            errors.push(ValidationError::PanelBorderRadiusOutOfRange(
                self.theme.panel_border_radius,
            ));
        }
        if !(3..=10).contains(&self.behavior.max_tool_calls) {
            errors.push(ValidationError::MaxToolCallsOutOfRange(
                self.behavior.max_tool_calls,
            ));
        }
        if !(5..=60).contains(&self.behavior.permission_timeout) {
            errors.push(ValidationError::PermissionTimeoutOutOfRange(
                self.behavior.permission_timeout,
            ));
        }
        if !(1024..=65536).contains(&self.pipe.buffer_size) {
            errors.push(ValidationError::BufferSizeOutOfRange(self.pipe.buffer_size));
        }

        if !(1000..=10000).contains(&self.pipe.connect_timeout) {
            errors.push(ValidationError::ConnectTimeoutOutOfRange(self.pipe.connect_timeout));
        }

        if self.behavior.hotkey.trim().is_empty() {
            errors.push(ValidationError::HotkeyEmpty);
        }

        if !(1..=10).contains(&self.pipe.max_retries) {
            errors.push(ValidationError::MaxRetriesOutOfRange(self.pipe.max_retries));
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

fn get_settings_path() -> PathBuf {
    let app_data = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(app_data).join("devsprite").join("settings.json")
}

/// Reads settings from %APPDATA%/devsprite/settings.json.
/// Returns defaults if the file is missing or corrupted.
pub fn load_settings() -> Settings {
    let path = get_settings_path();
    if !path.exists() {
        log::info!("Settings file not found, using defaults");
        return Settings::default();
    }

    match fs::read_to_string(&path) {
        Ok(content) => {
            let settings: Settings = serde_json::from_str(&content).unwrap_or_else(|e| {
                log::warn!("Failed to parse settings ({}), using defaults", e);
                Settings::default()
            });
            log::info!("Loaded settings: {:?}", settings);
            settings
        }
        Err(e) => {
            log::warn!("Failed to read settings ({}), using defaults", e);
            Settings::default()
        }
    }
}

/// Writes settings to %APPDATA%/devsprite/settings.json with pretty formatting.
pub fn save_settings(settings: &Settings) -> std::io::Result<()> {
    let path = get_settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let content = serde_json::to_string_pretty(settings)?;
    fs::write(&path, content)?;

    log::info!("Saved settings: {:?}", settings);
    Ok(())
}

// ---------------------------------------------------------------------------
// Legacy config migration
// ---------------------------------------------------------------------------

fn get_legacy_config_path() -> PathBuf {
    let app_data = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(app_data).join("devsprite").join("config.json")
}

#[derive(Debug, Deserialize)]
struct LegacyConfig {
    window_x: i32,
    window_y: i32,
    is_visible: bool,
}

pub fn migrate_legacy_config() {
    let legacy_path = get_legacy_config_path();
    if !legacy_path.exists() {
        return;
    }

    log::info!("Found legacy config.json, migrating...");

    if let Ok(content) = fs::read_to_string(&legacy_path) {
        if let Ok(legacy) = serde_json::from_str::<LegacyConfig>(&content) {
            let mut settings = Settings::default();
            settings.window.x = legacy.window_x;
            settings.window.y = legacy.window_y;
            settings.window.visible = legacy.is_visible;

            if save_settings(&settings).is_ok() {
                let _ = fs::remove_file(&legacy_path);
                log::info!("Legacy config migrated and removed");
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_default_settings() {
        let settings = Settings::default();

        // WindowSettings
        assert_eq!(settings.window.x, 100);
        assert_eq!(settings.window.y, 100);
        assert_eq!(settings.window.visible, true);
        assert_eq!(settings.window.width, 220);
        assert_eq!(settings.window.height, 400);

        // PipeSettings
        assert_eq!(settings.pipe.name, "devsprite");
        assert_eq!(settings.pipe.buffer_size, 4096);
        assert_eq!(settings.pipe.connect_timeout, 3000);

        // ThemeSettings
        assert_eq!(settings.theme.primary_color, "#667eea");
        assert_eq!(settings.theme.primary_dark_color, "#764ba2");
        assert_eq!(settings.theme.panel_width, 200);
        assert_eq!(settings.theme.panel_background_opacity, 0.95);
        assert_eq!(settings.theme.panel_border_radius, 12);

        // BehaviorSettings
        assert_eq!(settings.behavior.max_tool_calls, 5);
        assert_eq!(settings.behavior.permission_timeout, 30);
        assert_eq!(settings.behavior.sound_enabled, true);
        assert_eq!(settings.behavior.sound_volume, 80);
    }

    #[test]
    fn test_validate_valid_settings() {
        let settings = Settings::default();
        assert!(settings.validate().is_ok());
    }

    #[test]
    fn test_validate_invalid_color() {
        let mut settings = Settings::default();
        settings.theme.primary_color = "not-a-color".to_string();
        let result = settings.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.contains(&ValidationError::InvalidColor("not-a-color".to_string())));
    }

    #[test]
    fn test_validate_invalid_color_length() {
        let mut settings = Settings::default();
        settings.theme.primary_color = "#1234567".to_string(); // 8 chars
        let result = settings.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.contains(&ValidationError::InvalidColorLength("#1234567".to_string())));
    }

    #[test]
    fn test_validate_panel_width_too_small() {
        let mut settings = Settings::default();
        settings.theme.panel_width = 100;
        let result = settings.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.contains(&ValidationError::PanelWidthOutOfRange(100)));
    }

    #[test]
    fn test_validate_max_tool_calls_too_high() {
        let mut settings = Settings::default();
        settings.behavior.max_tool_calls = 20;
        let result = settings.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.contains(&ValidationError::MaxToolCallsOutOfRange(20)));
    }

    #[test]
    fn test_save_and_load_settings() {
        let temp_dir = env::temp_dir().join("devsprite_test_settings_roundtrip");
        let _ = fs::create_dir_all(&temp_dir);
        let path = temp_dir.join("settings.json");

        let settings = Settings {
            window: WindowSettings {
                x: 250,
                y: 350,
                visible: false,
                width: 300,
                height: 700,
            },
            ..Settings::default()
        };

        // Save
        let content = serde_json::to_string_pretty(&settings).unwrap();
        fs::write(&path, &content).unwrap();

        // Load
        let loaded: Settings = if path.exists() {
            let content = fs::read_to_string(&path).unwrap();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            Settings::default()
        };

        assert_eq!(loaded.window.x, 250);
        assert_eq!(loaded.window.y, 350);
        assert_eq!(loaded.window.visible, false);
        assert_eq!(loaded.window.width, 300);
        assert_eq!(loaded.window.height, 700);

        // Verify default sub-structs are preserved
        assert_eq!(loaded.pipe.name, "devsprite");
        assert_eq!(loaded.theme.primary_color, "#667eea");

        // Clean up
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_load_corrupted_returns_default() {
        let temp_dir = env::temp_dir().join("devsprite_test_settings_corrupted");
        let _ = fs::create_dir_all(&temp_dir);
        let path = temp_dir.join("settings.json");

        fs::write(&path, "this is not json!!!").unwrap();

        let settings: Settings = if path.exists() {
            let content = fs::read_to_string(&path).unwrap();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            Settings::default()
        };

        // Should fall back to defaults
        assert_eq!(settings.window.x, 100);
        assert_eq!(settings.pipe.name, "devsprite");
        assert_eq!(settings.theme.primary_color, "#667eea");

        // Clean up
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_serialize_deserialize_roundtrip() {
        let original = Settings {
            window: WindowSettings {
                x: 999,
                y: 888,
                visible: false,
                width: 400,
                height: 900,
            },
            pipe: PipeSettings {
                name: "custom-pipe".to_string(),
                buffer_size: 8192,
                connect_timeout: 5000,
                max_retries: 3,
            },
            theme: ThemeSettings {
                primary_color: "#ff0000".to_string(),
                primary_dark_color: "#00ff00".to_string(),
                panel_width: 250,
                panel_background_opacity: 0.8,
                panel_border_radius: 8,
            },
            behavior: BehaviorSettings {
                max_tool_calls: 7,
                permission_timeout: 45,
                hotkey: "Ctrl+Shift+D".to_string(),
                auto_launch: true,
                sound_enabled: true,
                sound_volume: 80,
            },
        };

        let json = serde_json::to_string(&original).unwrap();
        let deserialized: Settings = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.window.x, 999);
        assert_eq!(deserialized.window.y, 888);
        assert_eq!(deserialized.window.visible, false);
        assert_eq!(deserialized.window.width, 400);
        assert_eq!(deserialized.window.height, 900);

        assert_eq!(deserialized.pipe.name, "custom-pipe");
        assert_eq!(deserialized.pipe.buffer_size, 8192);
        assert_eq!(deserialized.pipe.connect_timeout, 5000);

        assert_eq!(deserialized.theme.primary_color, "#ff0000");
        assert_eq!(deserialized.theme.primary_dark_color, "#00ff00");
        assert_eq!(deserialized.theme.panel_width, 250);
        assert_eq!(deserialized.theme.panel_background_opacity, 0.8);
        assert_eq!(deserialized.theme.panel_border_radius, 8);

        assert_eq!(deserialized.behavior.max_tool_calls, 7);
        assert_eq!(deserialized.behavior.permission_timeout, 45);
        assert_eq!(deserialized.behavior.auto_launch, true);
    }

    #[test]
    fn test_migrate_legacy_config() {
        let legacy_json = r#"{"window_x":250,"window_y":350,"is_visible":false}"#;

        // Parse legacy config (mirrors migrate_legacy_config logic)
        let legacy: LegacyConfig = serde_json::from_str(legacy_json).unwrap();
        assert_eq!(legacy.window_x, 250);
        assert_eq!(legacy.window_y, 350);
        assert_eq!(legacy.is_visible, false);

        // Verify it maps to new settings
        let mut settings = Settings::default();
        settings.window.x = legacy.window_x;
        settings.window.y = legacy.window_y;
        settings.window.visible = legacy.is_visible;
        assert_eq!(settings.window.x, 250);
        assert_eq!(settings.window.y, 350);
        assert_eq!(settings.window.visible, false);
    }

    #[test]
    fn test_default_hotkey() {
        let settings = Settings::default();
        assert_eq!(settings.behavior.hotkey, "Ctrl+Shift+D");
    }

    #[test]
    fn test_validate_empty_hotkey() {
        let mut settings = Settings::default();
        settings.behavior.hotkey = "  ".to_string();
        let result = settings.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.contains(&ValidationError::HotkeyEmpty));
    }

    #[test]
    fn test_default_max_retries() {
        let settings = Settings::default();
        assert_eq!(settings.pipe.max_retries, 3);
    }

    #[test]
    fn test_validate_max_retries_out_of_range() {
        let mut settings = Settings::default();
        settings.pipe.max_retries = 0;
        let result = settings.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert!(errors.contains(&ValidationError::MaxRetriesOutOfRange(0)));
    }
}
