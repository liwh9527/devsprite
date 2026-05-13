pub struct Config {
    pub pipe_name: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            pipe_name: "devsprite".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = Config::default();
        assert_eq!(config.pipe_name, "devsprite");
    }
}
