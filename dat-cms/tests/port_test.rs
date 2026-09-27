use std::process::Command;

#[test]
fn startup_port_matches_deployment_mode() {
    for (configured, binary_port) in [(None, 8088), (Some(""), 8088), (Some("9090"), 9090)] {
        let output = startup_output(configured);
        let port = if cfg!(feature = "container") {
            80
        } else {
            binary_port
        };
        assert!(
            output.lines().any(|line| line == format!("port: {port}")),
            "{output}"
        );
    }
}

#[test]
fn container_does_not_parse_binary_port_setting() {
    let output = startup_output(Some("invalid"));
    if cfg!(feature = "container") {
        assert!(output.lines().any(|line| line == "port: 80"), "{output}");
    } else {
        assert!(
            output.contains("invalid argument PORT: invalid"),
            "{output}"
        );
    }
}

fn startup_output(port: Option<&str>) -> String {
    let mut command = Command::new(env!("CARGO_BIN_EXE_dat-cms"));
    command
        .env_remove("PORT")
        .env("DB_URI", "unsupported:port-test")
        .env("DEBUG", "0")
        .env("LOG_FILE", "")
        .env("LOG_CONSOLE", "0")
        .env("SINGLE_NODE", "")
        .env("TOKEN_MASTER", "")
        .env("TOKEN_CERT_FULL", "")
        .env("TOKEN_CERT_VERIFY", "");
    if let Some(port) = port {
        command.env("PORT", port);
    }
    let output = command.output().expect("start CMS");
    assert!(!output.status.success());
    format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}
