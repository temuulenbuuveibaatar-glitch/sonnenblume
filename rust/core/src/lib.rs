//! Sonnenblume health-status engine.
//!
//! Pure functions, no allocation, no dependencies. The same thresholds as the indicator table in
//! `js/app.js` (the JavaScript copy stays as a fallback for browsers without WebAssembly, and a
//! parity test in `tests/smoke_test.py` checks that both give identical answers).
//!
//! Status codes returned to JavaScript: 0 = no data / invalid, 1 = nominal, 2 = watch, 3 = act now.

#![cfg_attr(not(test), no_std)]

#[cfg(not(test))]
#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    loop {}
}

pub const NONE: u32 = 0;
pub const OK: u32 = 1;
pub const WATCH: u32 = 2;
pub const ALERT: u32 = 3;

/// Indicator ids (must match `RUST_KIND` in js/app.js).
pub mod kind {
    pub const HR: u32 = 0;
    pub const BP: u32 = 1;
    pub const SPO2: u32 = 2;
    pub const TEMP: u32 = 3;
    pub const GLUCOSE: u32 = 4;
    pub const SLEEP: u32 = 5;
    pub const MOOD: u32 = 6;
    pub const EXERCISE: u32 = 7;
    pub const HYDRATION: u32 = 8;
    pub const MASS: u32 = 9;
    pub const DOSE: u32 = 10;
    pub const VISION: u32 = 11;
}

fn finite(x: f64) -> bool {
    x.is_finite()
}

/// Status of one reading.
/// * `v` the value (systolic for blood pressure, 0/1 for vision)
/// * `a` diastolic (bp), baseline mass in kg (mass) or the environment's typical daily dose in mSv (dose)
pub fn status(k: u32, v: f64, a: f64) -> u32 {
    if !finite(v) {
        return NONE;
    }
    use kind::*;
    match k {
        HR => if v < 45.0 || v > 110.0 { ALERT } else if v < 50.0 || v > 100.0 { WATCH } else { OK },
        BP => {
            if !finite(a) {
                return NONE;
            }
            if v >= 160.0 || a >= 100.0 || v < 85.0 { ALERT }
            else if v >= 130.0 || a >= 85.0 || v < 90.0 { WATCH }
            else { OK }
        }
        SPO2 => if v < 92.0 { ALERT } else if v < 95.0 { WATCH } else { OK },
        TEMP => if v > 38.0 || v < 35.5 { ALERT } else if v > 37.5 || v < 36.1 { WATCH } else { OK },
        GLUCOSE => if v < 60.0 || v > 125.0 { ALERT } else if v < 70.0 || v > 99.0 { WATCH } else { OK },
        SLEEP => if v < 5.0 { ALERT } else if v < 7.0 { WATCH } else { OK },
        MOOD => if v <= 2.0 { ALERT } else if v == 3.0 { WATCH } else { OK },
        EXERCISE => if v < 45.0 { ALERT } else if v < 90.0 { WATCH } else { OK },
        HYDRATION => if v < 1.5 { ALERT } else if v < 2.0 { WATCH } else { OK },
        MASS => {
            if !finite(a) || a <= 0.0 {
                return NONE;
            }
            let loss_pct = (a - v) / a * 100.0;
            if loss_pct > 5.0 { ALERT } else if loss_pct > 2.0 { WATCH } else { OK }
        }
        DOSE => {
            if !finite(a) || a <= 0.0 {
                return NONE;
            }
            if v > a * 5.0 { ALERT } else if v > a * 1.6 { WATCH } else { OK }
        }
        VISION => if v != 0.0 { WATCH } else { OK },
        _ => NONE,
    }
}

/// True (1) when a reading is in the critical range that triggers an immediate crew alert.
pub fn critical(k: u32, v: f64, a: f64) -> u32 {
    if !finite(v) {
        return 0;
    }
    use kind::*;
    let c = match k {
        HR => v < 30.0 || v > 200.0,
        BP => v < 70.0 || v > 220.0 || (finite(a) && a > 130.0),
        SPO2 => v < 85.0,
        TEMP => v < 34.0 || v > 41.0,
        GLUCOSE => v < 40.0 || v > 400.0,
        _ => false,
    };
    c as u32
}

/// Cumulative dose against the career limit: watch above 50 %, act now above 80 %.
pub fn radiation(cumulative_msv: f64, career_limit_msv: f64) -> u32 {
    if !finite(cumulative_msv) || !finite(career_limit_msv) || career_limit_msv <= 0.0 {
        return NONE;
    }
    let p = cumulative_msv / career_limit_msv;
    if p > 0.8 { ALERT } else if p > 0.5 { WATCH } else { OK }
}

/// Median of a slice (sorted copy, insertion sort: the inputs are at most a week of readings).
pub fn median(xs: &[f64]) -> f64 {
    let n = xs.len().min(BUF_LEN);
    if n == 0 {
        return f64::NAN;
    }
    let mut s = [0.0f64; BUF_LEN];
    s[..n].copy_from_slice(&xs[..n]);
    for i in 1..n {
        let mut j = i;
        while j > 0 && s[j - 1] > s[j] {
            s.swap(j - 1, j);
            j -= 1;
        }
    }
    let m = n / 2;
    if n % 2 == 1 { s[m] } else { (s[m - 1] + s[m]) / 2.0 }
}

/// 1 when `current` is further than `jump` from the personal baseline (median of the previous
/// readings). Needs at least 3 previous readings to say anything.
pub fn baseline_shift(current: f64, previous: &[f64], jump: f64) -> u32 {
    if previous.len() < 3 || !finite(current) || !finite(jump) {
        return 0;
    }
    let m = median(previous);
    ((current - m).abs() > jump) as u32
}

// ---------------- WebAssembly interface ----------------
// A fixed buffer lets JavaScript pass a short list of numbers without an allocator.

pub const BUF_LEN: usize = 64;
static mut BUF: [f64; BUF_LEN] = [0.0; BUF_LEN];

#[no_mangle]
pub extern "C" fn sb_buf_ptr() -> *mut f64 {
    core::ptr::addr_of_mut!(BUF) as *mut f64
}

#[no_mangle]
pub extern "C" fn sb_buf_len() -> u32 {
    BUF_LEN as u32
}

fn buf(n: u32) -> &'static [f64] {
    let n = (n as usize).min(BUF_LEN);
    // SAFETY: single-threaded WebAssembly; JavaScript writes the buffer before each call.
    unsafe { core::slice::from_raw_parts(core::ptr::addr_of!(BUF) as *const f64, n) }
}

#[no_mangle]
pub extern "C" fn sb_status(k: u32, v: f64, a: f64) -> u32 {
    status(k, v, a)
}

#[no_mangle]
pub extern "C" fn sb_critical(k: u32, v: f64, a: f64) -> u32 {
    critical(k, v, a)
}

#[no_mangle]
pub extern "C" fn sb_radiation(cumulative: f64, limit: f64) -> u32 {
    radiation(cumulative, limit)
}

#[no_mangle]
pub extern "C" fn sb_median(n: u32) -> f64 {
    median(buf(n))
}

#[no_mangle]
pub extern "C" fn sb_baseline_shift(current: f64, n: u32, jump: f64) -> u32 {
    baseline_shift(current, buf(n), jump)
}

/// Engine version, so the console can show which engine is running.
#[no_mangle]
pub extern "C" fn sb_version() -> u32 {
    1
}

#[cfg(test)]
mod tests {
    use super::kind::*;
    use super::*;

    #[test]
    fn heart_rate_bands() {
        assert_eq!(status(HR, 72.0, 0.0), OK);
        assert_eq!(status(HR, 50.0, 0.0), OK);
        assert_eq!(status(HR, 49.0, 0.0), WATCH);
        assert_eq!(status(HR, 105.0, 0.0), WATCH);
        assert_eq!(status(HR, 111.0, 0.0), ALERT);
        assert_eq!(status(HR, 44.0, 0.0), ALERT);
        assert_eq!(status(HR, f64::NAN, 0.0), NONE);
    }

    #[test]
    fn blood_pressure_uses_both_numbers() {
        assert_eq!(status(BP, 118.0, 76.0), OK);
        assert_eq!(status(BP, 128.0, 86.0), WATCH);
        assert_eq!(status(BP, 162.0, 90.0), ALERT);
        assert_eq!(status(BP, 120.0, 101.0), ALERT);
        assert_eq!(status(BP, 84.0, 60.0), ALERT);
        assert_eq!(status(BP, 120.0, f64::NAN), NONE);
        assert_eq!(critical(BP, 230.0, 90.0), 1);
        assert_eq!(critical(BP, 120.0, 80.0), 0);
    }

    #[test]
    fn oxygen_temperature_glucose() {
        assert_eq!(status(SPO2, 97.0, 0.0), OK);
        assert_eq!(status(SPO2, 94.0, 0.0), WATCH);
        assert_eq!(status(SPO2, 91.0, 0.0), ALERT);
        assert_eq!(critical(SPO2, 84.0, 0.0), 1);
        assert_eq!(status(TEMP, 36.8, 0.0), OK);
        assert_eq!(status(TEMP, 37.8, 0.0), WATCH);
        assert_eq!(status(TEMP, 38.4, 0.0), ALERT);
        assert_eq!(status(GLUCOSE, 92.0, 0.0), OK);
        assert_eq!(status(GLUCOSE, 65.0, 0.0), WATCH);
        assert_eq!(status(GLUCOSE, 130.0, 0.0), ALERT);
    }

    #[test]
    fn lifestyle_indicators() {
        assert_eq!(status(SLEEP, 7.5, 0.0), OK);
        assert_eq!(status(SLEEP, 6.0, 0.0), WATCH);
        assert_eq!(status(SLEEP, 4.0, 0.0), ALERT);
        assert_eq!(status(MOOD, 4.0, 0.0), OK);
        assert_eq!(status(MOOD, 3.0, 0.0), WATCH);
        assert_eq!(status(MOOD, 2.0, 0.0), ALERT);
        assert_eq!(status(EXERCISE, 95.0, 0.0), OK);
        assert_eq!(status(EXERCISE, 60.0, 0.0), WATCH);
        assert_eq!(status(EXERCISE, 30.0, 0.0), ALERT);
        assert_eq!(status(HYDRATION, 2.4, 0.0), OK);
        assert_eq!(status(HYDRATION, 1.8, 0.0), WATCH);
        assert_eq!(status(HYDRATION, 1.2, 0.0), ALERT);
        assert_eq!(status(VISION, 0.0, 0.0), OK);
        assert_eq!(status(VISION, 1.0, 0.0), WATCH);
    }

    #[test]
    fn mass_loss_against_baseline() {
        assert_eq!(status(MASS, 79.0, 80.0), OK);
        assert_eq!(status(MASS, 78.0, 80.0), WATCH);
        assert_eq!(status(MASS, 75.0, 80.0), ALERT);
        assert_eq!(status(MASS, 75.0, 0.0), NONE);
    }

    #[test]
    fn radiation_daily_and_cumulative() {
        assert_eq!(status(DOSE, 0.5, 0.5), OK);
        assert_eq!(status(DOSE, 0.9, 0.5), WATCH);
        assert_eq!(status(DOSE, 3.0, 0.5), ALERT);
        assert_eq!(radiation(100.0, 600.0), OK);
        assert_eq!(radiation(320.0, 600.0), WATCH);
        assert_eq!(radiation(500.0, 600.0), ALERT);
    }

    #[test]
    fn baseline_and_median() {
        assert_eq!(median(&[3.0, 1.0, 2.0]), 2.0);
        assert_eq!(median(&[4.0, 1.0, 3.0, 2.0]), 2.5);
        assert!(median(&[]).is_nan());
        assert_eq!(baseline_shift(72.0, &[70.0, 71.0, 69.0], 25.0), 0);
        assert_eq!(baseline_shift(100.0, &[70.0, 71.0, 69.0], 25.0), 1);
        assert_eq!(baseline_shift(100.0, &[70.0, 71.0], 25.0), 0);
    }

    #[test]
    fn unknown_kind_is_no_data() {
        assert_eq!(status(99, 1.0, 1.0), NONE);
        assert_eq!(critical(99, 1.0, 1.0), 0);
    }
}
