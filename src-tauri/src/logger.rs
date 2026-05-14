use log4rs::config::{Appender, Config, Root};
use log4rs::append::console::ConsoleAppender;
use log4rs::append::rolling_file::RollingFileAppender;
use log4rs::append::rolling_file::policy::compound::CompoundPolicy;
use log4rs::append::rolling_file::policy::compound::roll::fixed_window::FixedWindowRoller;
use log4rs::append::rolling_file::policy::compound::trigger::size::SizeTrigger;
use log4rs::encode::pattern::PatternEncoder;

pub fn init() {
    let app_data = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    let log_dir = std::path::PathBuf::from(app_data).join("devsprite").join("logs");

    // Ensure log directory exists
    if let Err(e) = std::fs::create_dir_all(&log_dir) {
        eprintln!("Failed to create log directory: {}", e);
        // Fallback to console-only logging
        let config = Config::builder()
            .appender(Appender::builder().build("console", Box::new(
                ConsoleAppender::builder()
                    .encoder(Box::new(PatternEncoder::new("{d} [{l}] {m}{n}")))
                    .build(),
            )))
            .build(Root::builder().appender("console").build(log::LevelFilter::Info))
            .unwrap();
        let _ = log4rs::init_config(config);
        return;
    }

    let log_path = log_dir.join("devsprite.log");

    // Size-based rolling: rotate when file reaches 5MB, keep 5 archived files
    let roller = FixedWindowRoller::builder()
        .build(&log_dir.join("devsprite.{}.log").to_string_lossy(), 5)
        .unwrap();

    let trigger = SizeTrigger::new(5 * 1024 * 1024); // 5MB

    let policy = CompoundPolicy::new(Box::new(trigger), Box::new(roller));

    let file_appender = RollingFileAppender::builder()
        .encoder(Box::new(PatternEncoder::new("{d} [{l}] {m}{n}")))
        .build(&log_path, Box::new(policy))
        .unwrap();

    let console_appender = ConsoleAppender::builder()
        .encoder(Box::new(PatternEncoder::new("{d} [{l}] {m}{n}")))
        .build();

    let config = Config::builder()
        .appender(Appender::builder().build("console", Box::new(console_appender)))
        .appender(Appender::builder().build("file", Box::new(file_appender)))
        .build(Root::builder()
            .appender("console")
            .appender("file")
            .build(log::LevelFilter::Info))
        .unwrap();

    let _ = log4rs::init_config(config);
}
