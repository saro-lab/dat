use dat::certificate::DatCertificate;
use dat::crypto::DatCryptoAlgorithm;
use dat::error::DatError;
use dat::manager::DatManager;
use dat::payload::DatPayload;
use dat::signature::DatSignatureAlgorithm;
use dat::util::now_unix_timestamp;
use rand::RngExt;
use std::time::Instant;
use tokio::task::JoinSet;

fn rand_string() -> String {
    let mut rng = rand::rng();
    (0..100).map(|_| { rng.sample(rand::distr::Alphanumeric) as char }).collect()
}

async fn loops(multi_thread: bool, loops: i64, certificates: &'static Vec<DatCertificate>, plain: &'static String, secure: &'static String) -> Result<(), DatError> {
    println!("\n{}", if multi_thread { "Multi-Thread" } else { "Single-Thread" });

    for certificate in certificates {
        let pre = format!("{} {}", certificate.signature_algorithm(), certificate.crypto_algorithm());

        let mut dat = String::new();

        let start = Instant::now();
        if multi_thread {
            let mut futures: JoinSet<String> = JoinSet::new();
            for _ in 0..loops {
                futures.spawn(async move {
                    DatManager::_issue(&certificate, &*plain, &*secure).unwrap()
                });
            }
            while let Some(res) = futures.join_next().await {
                dat = res.unwrap();
            }
        } else {
            for _ in 0..loops {
                dat = DatManager::_issue(&certificate, &*plain, &*secure)?;
            }
        }
        let duration = start.elapsed();
        println!("{pre} Issue * {loops} : {}ms", duration.as_millis());

        let dat: &'static String = Box::leak(Box::new(dat));
        let mut payload = DatManager::_parse(&certificate, dat.clone().try_into()?)?;

        let start = Instant::now();
        if multi_thread {
            let mut futures: JoinSet<DatPayload> = JoinSet::new();
            for _ in 0..loops {
                futures.spawn(async move {
                    DatManager::_parse(&certificate, dat.clone().try_into().unwrap()).unwrap()
                });
            }
            while let Some(res) = futures.join_next().await {
                payload = res.unwrap();
            }
        } else {
            for _ in 0..loops {
                payload = DatManager::_parse(&certificate, dat.clone().try_into()?)?;
            }
        }
        let duration = start.elapsed();
        println!("{pre} Parse * {loops} : {}ms", duration.as_millis());

        assert_eq!(plain, &payload.plain_text()?);
        assert_eq!(secure, &payload.secure_text()?);
    }

    Ok(())
}

async fn benchmark(loop_size: i64) -> Result<(), DatError> {

    let plain: &'static String = Box::leak(Box::new(rand_string()));
    let secure: &'static String = Box::leak(Box::new(rand_string()));

    println!("performance test (plain, secure)");
    println!("plain: {}", plain);
    println!("secure: {}", secure);

    let mut certificates = Vec::with_capacity(6);

    for signature_algorithm in DatSignatureAlgorithm::list() {
        for crypto_algorithm in DatCryptoAlgorithm::list() {
            certificates.push(DatCertificate::generate(
                0,
                now_unix_timestamp() - 10,
                200,
                100,
                *signature_algorithm,
                *crypto_algorithm,
            )?)
        }
    }

    let certificates: &'static Vec<DatCertificate> = Box::leak(Box::new(certificates));

    loops(true, loop_size, &certificates, &plain, &secure).await?;
    loops(false, loop_size, &certificates, &plain, &secure).await?;

    Ok(())
}

// cargo test --color=always --package dat --test bench_test --profile release -- test --exact --nocapture
#[tokio::test(flavor = "multi_thread")]
async fn test() {
    if cfg!(debug_assertions) {
        println!("performance test is disabled in debug mode.");
        return;
    }

    let loop_size = 10000;

    benchmark(loop_size).await.unwrap();
}
