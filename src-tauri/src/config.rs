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
