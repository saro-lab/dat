use std::io::stdout;
use std::panic;
use tracing::level_filters::LevelFilter;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::{
    fmt::{self},
    prelude::*,
};
use crate::env::ENV;

pub fn bind() {

    let file = if ENV.log.file {
        let file_appender = RollingFileAppender::builder()
        .rotation(Rotation::DAILY)
        .filename_prefix(format!("dat-{}", ENV.server.hostname))
        .filename_suffix("log")
        .build("./logs")
        .expect("Failed to create file appender");

        if ENV.log.json {
            Some(fmt::layer().json()
                .with_span_list(false)
                .with_target(true)
                .with_thread_ids(true)
                .with_writer(file_appender)
                .boxed()
            )
        } else {
            Some(fmt::layer().with_ansi(false)
                .with_target(true)
                .with_thread_ids(true)
                .with_writer(file_appender)
                .boxed()
            )
        }
    } else {
        None
    };

    let console = if ENV.log.console {
        Some(fmt::layer()
            .with_level(true)
             .with_target(true)
             .with_thread_ids(true)
             .with_line_number(true)
             .with_writer(stdout) // 출력을 표준 출력(화면)으로 보냄
             .with_filter(if ENV.server.debug { LevelFilter::DEBUG } else { LevelFilter::INFO })
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
        let payload = panic_info.payload().downcast_ref::<&str>()
            .map(|s| *s)
            .or_else(|| panic_info.payload().downcast_ref::<String>().map(|s| s.as_str()))
            .unwrap_or("Unknown error");

        let location = panic_info.location().unwrap();

        tracing::error!(
            message = payload,
            location = format!("{}:{}", location.file(), location.line()),
        );
    }));
}
