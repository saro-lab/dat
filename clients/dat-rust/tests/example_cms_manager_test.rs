#[cfg(all(test, feature = "dat_cms"))]
mod dat_cms {
    use dat::cms_manager::DatCmsManager;
    use dat::error::DatError;
    use std::sync::{Arc, OnceLock};

    static DAT_CMS_MANAGER: OnceLock<Arc<DatCmsManager>> = OnceLock::new();

    #[inline]
    pub fn get_cms_manager() -> Result<Arc<DatCmsManager>, DatError> {
        DAT_CMS_MANAGER.get()
            .map(|manager| Arc::clone(manager))
            .ok_or_else(|| DatError::EtcError("dat auto sync manager not initialized"))
    }

    async fn test_auto_sync() -> Result<(), DatError> {
        let manager = get_cms_manager()?;

        let plain = "Unicode 유니코드 ユニコード 万国码 يونيكود यूनिकोड Юникод 🦄💻";
        let secure = "Ciphertext 암호문 暗号文 密文 Шифротекст Texte chiffré Geheimtext نص مشفر सिफरपाठ 🔐";

        let dat = manager.issue(plain, secure)?;

        println!("dat: {:?}", dat);

        let payload = manager.parse(dat)?;

        assert_eq!(plain, payload.plain_text()?);
        assert_eq!(secure, payload.secure_text()?);
        println!("payload plain: {:?}", payload.plain_text()?);
        println!("payload secure: {:?}", payload.secure_text()?);

        Ok(())
    }

    // manual text
    #[tokio::test]
    /// ```shell
    /// RUST_LOG=debug cargo test --test example_cms_manager_test --features full dat_cms::test -- --nocapture
    /// ```
    async fn test() {
        // init tracing
        tracing_subscriber::fmt()
            .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
            .with_test_writer()
            .init();

        /*
        # server example
        TOKEN_MASTER="123456789012" \
        TOKEN_CERT_FULL="12345678901a,12345678901b" \
        TOKEN_CERT_VERIFY="12345678901C,12345678901D" \
        .\dat-cms
        */

        // init sync before server start
        let manager = DatCmsManager::builder()
            .url("http://localhost:8088").unwrap()
            .interval_off()
            .interval(std::time::Duration::from_secs(1))
            .token("12345678901b")
            .build().await;
        DAT_CMS_MANAGER.set(manager).map_err(|_| "failed to set auto sync manager".to_string()).unwrap();

        // test
        let _ = test_auto_sync().await;

        tokio::time::sleep(std::time::Duration::from_secs(10)).await
    }

}
