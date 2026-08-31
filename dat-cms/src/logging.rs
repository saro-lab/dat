use std::io::stdout;
use std::panic;
use tracing::level_filters::LevelFilter;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::{
    fmt::{self},
    prelude::*,
};

pub struct LogConfig {
    pub console: bool,
    pub file: bool,
    pub json: bool,
    pub file_dir: String,
    pub file_prefix: String,
    pub debug: bool,
}

pub fn init(config: &LogConfig) {
    let file = if config.file {
        let file_appender = RollingFileAppender::builder()
            .rotation(Rotation::DAILY)
            .filename_prefix(&config.file_prefix)
            .filename_suffix("log")
            .build(&config.file_dir)
            .expect("Failed to create file appender");

        let level = if config.debug {
            LevelFilter::DEBUG
        } else {
            LevelFilter::INFO
        };

        if config.json {
            Some(
                fmt::layer()
                    .json()
                    .with_span_list(false)
                    .with_target(true)
                    .with_thread_ids(true)
                    .with_writer(file_appender)
                    .with_filter(level)
                    .boxed(),
            )
        } else {
            Some(
                fmt::layer()
                    .with_ansi(false)
                    .with_target(true)
                    .with_thread_ids(true)
                    .with_writer(file_appender)
                    .with_filter(level)
                    .boxed(),
            )
        }
    } else {
        None
    };

    let console = if config.console {
        Some(
            fmt::layer()
                .with_level(true)
                .with_target(true)
                .with_thread_ids(true)
                .with_line_number(true)
                .with_writer(stdout)
                .with_filter(if config.debug {
                    LevelFilter::DEBUG
                } else {
                    LevelFilter::INFO
                }),
        )
    } else {
        None
    };

    tracing_subscriber::registry()
        .with(file)
        .with(console)
        .init();

    setup_panic_hook();
}

fn setup_panic_hook() {
    panic::set_hook(Box::new(move |panic_info| {
        let location = panic_info
            .location()
            .map(|x| format!("{}:{}", x.file(), x.line()))
            .unwrap_or_else(|| "unknown".to_string());

        tracing::error!(code = crate::codes::STORE_UNKNOWN, location, "PANIC");
    }));
}
