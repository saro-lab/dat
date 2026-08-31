use dat::certificate::DatCertificate;
use dat::crypto::DatCryptoAlgorithm;
use dat::manager::DatManager;
use dat::signature::DatSignatureAlgorithm;
use dat::util::now_unix_timestamp;
use std::alloc::{GlobalAlloc, Layout, System};
use std::hint::black_box;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

struct CountingAllocator;

static TRACKING: AtomicBool = AtomicBool::new(false);
static ALLOCATION_COUNT: AtomicUsize = AtomicUsize::new(0);
static ALLOCATED_BYTES: AtomicUsize = AtomicUsize::new(0);
static LIVE_BYTES: AtomicUsize = AtomicUsize::new(0);
static PEAK_LIVE_BYTES: AtomicUsize = AtomicUsize::new(0);
static MEASUREMENT_LOCK: Mutex<()> = Mutex::new(());

#[global_allocator]
static ALLOCATOR: CountingAllocator = CountingAllocator;

fn saturating_add(counter: &AtomicUsize, amount: usize) -> usize {
    let mut current = counter.load(Ordering::Relaxed);
    loop {
        let next = current.saturating_add(amount);
        match counter.compare_exchange_weak(current, next, Ordering::Relaxed, Ordering::Relaxed) {
            Ok(_) => return next,
            Err(actual) => current = actual,
        }
    }
}

fn saturating_subtract(counter: &AtomicUsize, amount: usize) -> usize {
    let mut current = counter.load(Ordering::Relaxed);
    loop {
        let next = current.saturating_sub(amount);
        match counter.compare_exchange_weak(current, next, Ordering::Relaxed, Ordering::Relaxed) {
            Ok(_) => return next,
            Err(actual) => current = actual,
        }
    }
}

fn update_peak(live: usize) {
    let mut peak = PEAK_LIVE_BYTES.load(Ordering::Relaxed);
    while live > peak {
        match PEAK_LIVE_BYTES.compare_exchange_weak(
            peak,
            live,
            Ordering::Relaxed,
            Ordering::Relaxed,
        ) {
            Ok(_) => break,
            Err(actual) => peak = actual,
        }
    }
}

fn record_allocation(size: usize) {
    if TRACKING.load(Ordering::Relaxed) {
        saturating_add(&ALLOCATION_COUNT, 1);
        saturating_add(&ALLOCATED_BYTES, size);
        update_peak(saturating_add(&LIVE_BYTES, size));
    }
}

fn record_deallocation(size: usize) {
    if TRACKING.load(Ordering::Relaxed) {
        saturating_subtract(&LIVE_BYTES, size);
    }
}

unsafe impl GlobalAlloc for CountingAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let pointer = unsafe { System.alloc(layout) };
        if !pointer.is_null() {
            record_allocation(layout.size());
        }
        pointer
    }

    unsafe fn alloc_zeroed(&self, layout: Layout) -> *mut u8 {
        let pointer = unsafe { System.alloc_zeroed(layout) };
        if !pointer.is_null() {
            record_allocation(layout.size());
        }
        pointer
    }

    unsafe fn dealloc(&self, pointer: *mut u8, layout: Layout) {
        record_deallocation(layout.size());
        unsafe { System.dealloc(pointer, layout) };
    }

    unsafe fn realloc(&self, pointer: *mut u8, layout: Layout, new_size: usize) -> *mut u8 {
        let resized = unsafe { System.realloc(pointer, layout, new_size) };
        if !resized.is_null() && TRACKING.load(Ordering::Relaxed) {
            saturating_add(&ALLOCATION_COUNT, 1);
            saturating_add(&ALLOCATED_BYTES, new_size);
            if new_size >= layout.size() {
                update_peak(saturating_add(&LIVE_BYTES, new_size - layout.size()));
            } else {
                saturating_subtract(&LIVE_BYTES, layout.size() - new_size);
            }
        }
        resized
    }
}

#[derive(Clone, Copy)]
struct AllocationStats {
    count: usize,
    allocated_bytes: usize,
    peak_live_bytes: usize,
    retained_live_bytes: usize,
}

struct TrackingGuard;

impl Drop for TrackingGuard {
    fn drop(&mut self) {
        TRACKING.store(false, Ordering::SeqCst);
    }
}

fn measure_allocations(operation: impl FnOnce()) -> AllocationStats {
    let _guard = MEASUREMENT_LOCK
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner);
    assert!(!TRACKING.load(Ordering::SeqCst));
    ALLOCATION_COUNT.store(0, Ordering::SeqCst);
    ALLOCATED_BYTES.store(0, Ordering::SeqCst);
    LIVE_BYTES.store(0, Ordering::SeqCst);
    PEAK_LIVE_BYTES.store(0, Ordering::SeqCst);
    TRACKING.store(true, Ordering::SeqCst);
    let tracking = TrackingGuard;
    operation();
    drop(tracking);
    AllocationStats {
        count: ALLOCATION_COUNT.load(Ordering::SeqCst),
        allocated_bytes: ALLOCATED_BYTES.load(Ordering::SeqCst),
        peak_live_bytes: PEAK_LIVE_BYTES.load(Ordering::SeqCst),
        retained_live_bytes: LIVE_BYTES.load(Ordering::SeqCst),
    }
}

fn certificate(
    cid: u64,
    signature: DatSignatureAlgorithm,
    crypto: DatCryptoAlgorithm,
) -> DatCertificate {
    DatCertificate::generate(cid, now_unix_timestamp() - 1, 3600, 300, signature, crypto).unwrap()
}

fn allocation_row(
    operation: &str,
    algorithm: &str,
    payload_bytes: usize,
    certificate_count: usize,
    iterations: usize,
    stats: AllocationStats,
) {
    let iterations = iterations.max(1);
    let certificates = certificate_count.max(1);
    println!(
        "{operation},{algorithm},{payload_bytes},{certificate_count},{iterations},{},{},{},{},{:.3},{:.3},{:.3},{:.3},{:.3}",
        stats.count,
        stats.allocated_bytes,
        stats.peak_live_bytes,
        stats.retained_live_bytes,
        stats.count as f64 / iterations as f64,
        stats.allocated_bytes as f64 / iterations as f64,
        stats.allocated_bytes as f64 / certificates as f64,
        stats.peak_live_bytes as f64 / certificates as f64,
        stats.retained_live_bytes as f64 / certificates as f64,
    );
}

#[test]
#[ignore = "manual release-mode allocation runner; run with one test thread"]
fn release_allocation_profile() {
    if cfg!(debug_assertions) {
        panic!(
            "run with: cargo test --release --test allocation_profile_test -- --ignored --nocapture --test-threads=1"
        );
    }

    let outside = black_box(Box::new([0_u8; 4096]));
    let underflow = measure_allocations(|| drop(outside));
    assert_eq!(underflow.count, 0);
    assert_eq!(underflow.allocated_bytes, 0);
    assert_eq!(underflow.peak_live_bytes, 0);
    assert_eq!(underflow.retained_live_bytes, 0);

    let realloc = measure_allocations(|| {
        let mut bytes = vec![0_u8; 8];
        bytes.reserve_exact(4096);
        black_box(&bytes);
    });
    assert!(realloc.count >= 2);
    assert!(realloc.allocated_bytes >= 4104);
    assert!(realloc.peak_live_bytes >= 4104);
    assert_eq!(realloc.retained_live_bytes, 0);

    println!(
        "operation,algorithm,payload_bytes,certificate_count,iterations,allocation_count,allocated_bytes,peak_live_bytes,retained_live_bytes,allocations_per_iteration,allocated_bytes_per_iteration,allocated_bytes_per_certificate,peak_live_bytes_per_certificate,retained_live_bytes_per_certificate"
    );
    let iterations = std::env::var("DAT_R1_ALLOC_ITERATIONS")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(16);
    let payload = (0..256)
        .map(|index| (index as u8).wrapping_mul(29))
        .collect::<Vec<_>>();

    for signature in DatSignatureAlgorithm::list() {
        for crypto in DatCryptoAlgorithm::list() {
            let algorithm = format!("{signature}+{crypto}");
            let cert = certificate(0, *signature, *crypto);
            let wire = cert.export(false).unwrap();
            let token = DatManager::_issue(&cert, &payload, &payload).unwrap();
            drop(cert.try_clone().unwrap());
            drop(wire.parse::<DatCertificate>().unwrap());
            drop(DatManager::_issue(&cert, &payload, &payload).unwrap());
            drop(DatManager::_parse(&cert, token.clone().try_into().unwrap()).unwrap());

            let stats = measure_allocations(|| {
                for _ in 0..iterations {
                    drop(black_box(cert.try_clone().unwrap()));
                }
            });
            assert_eq!(stats.retained_live_bytes, 0);
            allocation_row("certificate_clone", &algorithm, 0, 1, iterations, stats);

            let stats = measure_allocations(|| {
                for _ in 0..iterations {
                    drop(black_box(wire.parse::<DatCertificate>().unwrap()));
                }
            });
            assert_eq!(stats.retained_live_bytes, 0);
            allocation_row(
                "certificate_parser",
                &algorithm,
                wire.len(),
                1,
                iterations,
                stats,
            );

            let stats = measure_allocations(|| {
                for _ in 0..iterations {
                    drop(black_box(
                        DatManager::_issue(&cert, &payload, &payload).unwrap(),
                    ));
                }
            });
            assert_eq!(stats.retained_live_bytes, 0);
            allocation_row("issue", &algorithm, payload.len(), 1, iterations, stats);

            let stats = measure_allocations(|| {
                for _ in 0..iterations {
                    drop(black_box(
                        DatManager::_parse(&cert, token.clone().try_into().unwrap()).unwrap(),
                    ));
                }
            });
            assert_eq!(stats.retained_live_bytes, 0);
            allocation_row("parse", &algorithm, payload.len(), 1, iterations, stats);
        }
    }

    let signature = DatSignatureAlgorithm::HmacSha256Mfs;
    let crypto = DatCryptoAlgorithm::IvAes128Gcm;
    let algorithm = format!("{signature}+{crypto}");
    for count in [1, 16, 256, 1024] {
        let wire = (0..count)
            .map(|cid| {
                certificate(cid as u64, signature, crypto)
                    .export(false)
                    .unwrap()
            })
            .collect::<Vec<_>>()
            .join("\n");

        let mut imported = None;
        let import = measure_allocations(|| {
            let manager = DatManager::new();
            assert_eq!(manager.import(black_box(&wire), true).unwrap(), count);
            imported = Some(manager);
        });
        assert_eq!(imported.as_ref().unwrap().export_cids().len(), count);
        assert!(import.peak_live_bytes >= import.retained_live_bytes);
        allocation_row("import", &algorithm, 0, count, 1, import);
        drop(imported);

        let manager = DatManager::new();
        assert_eq!(manager.import(&wire, true).unwrap(), count);
        drop(manager.export(false).unwrap());
        let export = measure_allocations(|| {
            drop(black_box(manager.export(false).unwrap()));
        });
        assert_eq!(export.retained_live_bytes, 0);
        allocation_row("export", &algorithm, 0, count, 1, export);
    }
}
