//! Bank-slip understanding for OpenJot.
//!
//! Three independent pieces:
//! 1. [`parse_slip_qr`] decodes the BOT Slip-Verify Mini-QR and TrueMoney QR
//!    TLV payloads and checks their CRC-16.
//! 2. [`parse_slip_text`] extracts amount, date, parties and memo from OCR text
//!    (English and Thai, with Buddhist-Era dates).
//! 3. [`call_akson_ocr`] sends an image to AksonOCR for Thai text that the local
//!    OCR cannot read.

use std::sync::LazyLock;
use std::time::Duration;

use base64::Engine as _;
use chrono::NaiveDate;
use regex::Regex;
use serde::{Deserialize, Serialize};

use crate::banks;

pub const DEFAULT_AKSON_OCR_MODEL: &str = "AksonOCR-preview";
const AKSON_OCR_ENDPOINT: &str = "https://backend.aksonocr.com/api/v2/ocr";

// ---------------------------------------------------------------------------
// QR decoding
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum QrKind {
    BotSlipVerify,
    TrueMoneySlip,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ParsedQr {
    pub kind: QrKind,
    /// Three-digit BOT code of the sending bank (BOT QR only).
    pub sending_bank: Option<String>,
    pub trans_ref: String,
    /// Transaction date from the QR as `YYYY-MM-DD` (TrueMoney only).
    pub qr_date_ymd: Option<String>,
    /// Whether the tag-91 CRC matches the payload.
    pub crc_valid: bool,
}

/// A single TLV element. Offsets are byte positions in the parsed string.
struct Tlv<'a> {
    tag: &'a str,
    value: &'a str,
    tag_start: usize,
    value_start: usize,
}

fn parse_tlv(s: &str) -> Result<Vec<Tlv<'_>>, String> {
    let mut out = Vec::new();
    let mut pos = 0;
    while pos < s.len() {
        let tag = s.get(pos..pos + 2).ok_or("truncated TLV tag")?;
        let len_str = s
            .get(pos + 2..pos + 4)
            .ok_or_else(|| format!("truncated TLV length for tag {tag}"))?;
        if !tag.bytes().all(|b| b.is_ascii_digit()) || !len_str.bytes().all(|b| b.is_ascii_digit())
        {
            return Err(format!("not a TLV payload at offset {pos}"));
        }
        let len: usize = len_str.parse().map_err(|_| "invalid TLV length")?;
        let value_start = pos + 4;
        let value = s
            .get(value_start..value_start + len)
            .ok_or_else(|| format!("value of tag {tag} overruns the payload"))?;
        out.push(Tlv {
            tag,
            value,
            tag_start: pos,
            value_start,
        });
        pos = value_start + len;
    }
    Ok(out)
}

/// CRC-16/CCITT-FALSE: polynomial 0x1021, initial value 0xFFFF, no reflection.
fn crc16_ccitt_false(data: &[u8]) -> u16 {
    let mut crc: u16 = 0xFFFF;
    for &byte in data {
        crc ^= u16::from(byte) << 8;
        for _ in 0..8 {
            crc = if crc & 0x8000 != 0 {
                (crc << 1) ^ 0x1021
            } else {
                crc << 1
            };
        }
    }
    crc
}

fn parse_crc_value(value: &str) -> Option<u16> {
    if value.is_empty() || value.len() > 4 || !value.bytes().all(|b| b.is_ascii_hexdigit()) {
        return None;
    }
    u16::from_str_radix(value, 16).ok()
}

/// Checks the tag-91 CRC. Stripped leading zeros are restored by comparing
/// numbers, so `"47D"` matches `"047D"`. The CRC is computed over the payload
/// up to the CRC value, including the `9104` header. Some issuers shorten the
/// header to `9103` when they drop a zero, so that form is tried as well.
fn crc_matches(raw: &str, crc: &Tlv<'_>) -> bool {
    let Some(expected) = parse_crc_value(crc.value) else {
        return false;
    };
    let canonical = format!("{}9104", &raw[..crc.tag_start]);
    if crc16_ccitt_false(canonical.as_bytes()) == expected {
        return true;
    }
    crc16_ccitt_false(&raw.as_bytes()[..crc.value_start]) == expected
}

/// Converts `DDMMYYYY` to `YYYY-MM-DD`. Buddhist-Era years are converted to CE.
fn parse_ddmmyyyy(s: &str) -> Option<String> {
    if s.len() != 8 || !s.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    let day: u32 = s[0..2].parse().ok()?;
    let month: u32 = s[2..4].parse().ok()?;
    let year = year_to_ce(s[4..8].parse().ok()?, false);
    ymd(year, month, day)
}

/// Decodes a BOT Slip-Verify Mini-QR or a TrueMoney slip QR.
///
/// PromptPay payment QRs (root `00 = "01"` with a `63` CRC) are rejected.
/// A CRC mismatch is not an error: it is reported through `crc_valid`.
pub fn parse_slip_qr(raw: &str) -> Result<ParsedQr, String> {
    let raw = raw.trim();
    let top = parse_tlv(raw)?;

    let root = top
        .iter()
        .find(|t| t.tag == "00")
        .ok_or("QR has no root tag 00")?;
    if root.value == "01" && top.iter().any(|t| t.tag == "63") {
        return Err("PromptPay payment QR, not a bank slip".into());
    }

    let crc_valid = top
        .iter()
        .find(|t| t.tag == "91")
        .is_some_and(|crc| crc_matches(raw, crc));

    let inner = parse_tlv(root.value)?;
    let field = |tag: &str| {
        inner
            .iter()
            .find(|t| t.tag == tag)
            .map(|t| t.value)
            .filter(|v| !v.is_empty())
    };

    if field("00") == Some("000001") {
        let bank = field("01").ok_or("BOT QR is missing the bank code")?;
        let trans_ref = field("02").ok_or("BOT QR is missing the transaction reference")?;
        return Ok(ParsedQr {
            kind: QrKind::BotSlipVerify,
            sending_bank: Some(bank.to_string()),
            trans_ref: trans_ref.to_string(),
            qr_date_ymd: None,
            crc_valid,
        });
    }

    if field("00") == Some("01") && field("01") == Some("01") {
        let tx_id = field("03").ok_or("TrueMoney QR is missing the transaction id")?;
        return Ok(ParsedQr {
            kind: QrKind::TrueMoneySlip,
            sending_bank: None,
            trans_ref: tx_id.to_string(),
            qr_date_ymd: field("04").and_then(parse_ddmmyyyy),
            crc_valid,
        });
    }

    Err("unrecognised slip QR payload".into())
}

// ---------------------------------------------------------------------------
// OCR text parsing
// ---------------------------------------------------------------------------

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ParsedSlipData {
    pub amount_satang: Option<i64>,
    pub fee_satang: Option<i64>,
    /// `YYYY-MM-DD` in the Gregorian calendar.
    pub occurred_date: Option<String>,
    /// `HH:MM`.
    pub occurred_time: Option<String>,
    pub sender_name: Option<String>,
    pub receiver_name: Option<String>,
    pub sender_acct_last4: Option<String>,
    pub receiver_acct_last4: Option<String>,
    pub memo: Option<String>,
    pub bank_id: Option<String>,
    pub trans_ref: Option<String>,
    pub is_self_transfer: bool,
    pub is_non_slip: bool,
    pub has_thai_script: bool,
    /// 0.0..=1.0
    pub confidence: f32,
    /// True when the local OCR result is too incomplete to trust and the slip
    /// should go to AksonOCR. This is set when the amount, receiver or date is
    /// missing, when the text looks mojibake, or when it has very few lines.
    pub needs_thai_ocr: bool,
}

const AMOUNT_KEYS: &[&str] = &[
    "จำนวนเงิน",
    "จำนวน",
    "amount",
    "ยอดโอน",
    "ยอดเงิน",
    "transfer amount",
];
const FEE_KEYS: &[&str] = &["ค่าธรรมเนียม", "ค่าบริการ", "fee", "service charge"];
const BALANCE_KEYS: &[&str] = &["คงเหลือ", "balance", "available", "remark:"];
const NON_SLIP_KEYS: &[&str] = &[
    "exchange from",
    "exchange rate",
    "you have received the exchanged",
    "receiving account: dime",
    "receiving account:dime",
    "fcd - usd",
    "market price",
    "stock amount",
    "commission fee",
    "trading hours",
    "order type",
    "dime! portfolio",
    "matched with sell orders",
    "does not include interests",
];
const SENDER_LABELS: &[&str] = &["จาก", "ผู้โอน", "from", "sender"];
const RECEIVER_LABELS: &[&str] = &["ไปยัง", "ถึง", "ผู้รับ", "to", "receiver"];
const MEMO_LABELS: &[&str] = &["บันทึกช่วยจำ", "หมายเหตุ", "memo", "note"];
const REF_LABELS: &[&str] = &[
    "เลขที่รายการ",
    "หมายเลขอ้างอิง",
    "รหัสอ้างอิง",
    "transaction id",
    "transaction no",
    "reference",
    "ref",
];
const NAME_REJECT: &[&str] = &[
    "ธนาคาร",
    "promptpay",
    "พร้อมเพย์",
    "kbank",
    "scb",
    "ktb",
    "ttb",
    "bbl",
    "krungthai",
    "krungsri",
    "dime!",
    "oime!",
    "powered by",
    "scan for",
    "scan to verify",
    "verify slip",
    "transfer completed",
    "payment completed",
    "top-up completed",
    "slip id",
    "transaction id",
    "amount",
    "fee",
];
const EXACT_NOISE_LINES: &[&str] = &[
    "date",
    "from",
    "to",
    "transfer",
    "payment",
    "top-up",
    "thb",
    "baht",
    "k+",
    "kbank",
    "bank",
    "scb",
    "ktb",
    "ttb",
    "bbl",
    "krungthai",
    "dime!",
    "oime!",
    "fee:",
    "amount:",
    "slip id",
    "my rabbi",
    "my rabbit",
];

/// Honorifics stripped before comparing names. Longer forms come first so that
/// `นางสาว` is not cut to `นาง` + `สาว`.
const HONORIFICS_TH: &[&str] = &["นางสาว", "ด.ช", "ด.ญ", "น.ส", "นาย", "นาง", "คุณ"];
const HONORIFICS_EN: &[&str] = &["mr", "mrs", "ms", "miss", "mx", "dr"];

/// Thai month tokens as printed, with and without dots. Used to build the regex.
const THAI_MONTHS: &[(&str, u32)] = &[
    ("มกราคม", 1),
    ("ม.ค.", 1),
    ("กุมภาพันธ์", 2),
    ("ก.พ.", 2),
    ("มีนาคม", 3),
    ("มี.ค.", 3),
    ("เมษายน", 4),
    ("เม.ย.", 4),
    ("พฤษภาคม", 5),
    ("พ.ค.", 5),
    ("มิถุนายน", 6),
    ("มิ.ย.", 6),
    ("กรกฎาคม", 7),
    ("ก.ค.", 7),
    ("สิงหาคม", 8),
    ("ส.ค.", 8),
    ("กันยายน", 9),
    ("ก.ย.", 9),
    ("ตุลาคม", 10),
    ("ต.ค.", 10),
    ("พฤศจิกายน", 11),
    ("พ.ย.", 11),
    ("ธันวาคม", 12),
    ("ธ.ค.", 12),
];

static AMOUNT_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"((?i:thb|baht)|฿|บาท)?\s*([0-9]{1,3}(?:[,.][0-9]{3})+(?:\.[0-9]{1,2})|[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*((?i:thb|baht)|฿|บาท|(?i:un|unn)\b)?",
    )
    .expect("valid amount pattern")
});

static MASKED_ACCT_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(?:[x*•]{2,}[-\sx*•]*|[x*•]-)([0-9]{3,4})(?:-[0-9x*•])?\b")
        .expect("valid masked account regex")
});

static THAI_DATE_RE: LazyLock<Regex> = LazyLock::new(|| {
    let months = THAI_MONTHS
        .iter()
        .map(|(tok, _)| regex::escape(tok).replace("\\.", "\\.?"))
        .collect::<Vec<_>>()
        .join("|");
    Regex::new(&format!(r"([0-9]{{1,2}})\s*({months})\s*([0-9]{{2,4}})"))
        .expect("valid Thai date pattern")
});

static ENGLISH_DATE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?i)\b([0-9]{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*([0-9]{2,4})\b",
    )
    .expect("valid English date pattern")
});

static ENGLISH_MONTH_FIRST_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?i)\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*([0-9]{1,2}),?\s*([0-9]{4})\b",
    )
    .expect("valid English month-first pattern")
});

static ISO_DATE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})\b").expect("valid ISO pattern")
});

static NUMERIC_DATE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b([0-9]{1,2})[/.-]([0-9]{1,2})[/.-]([0-9]{4}|[0-9]{2})\b")
        .expect("valid numeric date pattern")
});

static TIME_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)([0-9]{1,2}):([0-9]{2})(?::[0-9]{2})?(?:\s*(am|pm))?")
        .expect("valid time pattern")
});

static REF_TOKEN_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[A-Za-z0-9]{8,}").expect("valid reference pattern"));

fn is_thai_char(c: char) -> bool {
    ('\u{0E00}'..='\u{0E7F}').contains(&c)
}

fn contains_any(lower: &str, keys: &[&str]) -> bool {
    keys.iter().any(|k| lower.contains(k))
}

/// Normalises OCR output: decomposed `ํา` becomes `ำ`, zero-width and
/// no-break characters are removed or converted.
fn normalize_text(text: &str) -> String {
    text.replace("\u{0E4D}\u{0E32}", "\u{0E33}")
        .replace('\u{00A0}', " ")
        .replace(['\u{200B}', '\u{200C}', '\u{200D}', '\u{FEFF}'], "")
}

fn lines_of(text: &str) -> Vec<String> {
    text.lines()
        .map(|l| l.split_whitespace().collect::<Vec<_>>().join(" "))
        .filter(|l| !l.is_empty())
        .collect()
}

/// Converts a printed amount such as `2,922.50` or OCR-confused `3.981.11` to satang.
fn to_satang(number: &str) -> Option<i64> {
    let mut cleaned: String = number.chars().filter(|c| *c != ',').collect();
    // Handle OCR reading comma as period: e.g. "3.981.11" -> "3981.11"
    if cleaned.matches('.').count() > 1 {
        if let Some(last_dot) = cleaned.rfind('.') {
            let int_part: String = cleaned[..last_dot].chars().filter(|c| *c != '.').collect();
            let frac_part = &cleaned[last_dot + 1..];
            cleaned = format!("{int_part}.{frac_part}");
        }
    }
    let (baht_str, frac) = match cleaned.split_once('.') {
        Some((b, f)) => (b, f),
        None => (cleaned.as_str(), ""),
    };
    if frac.len() > 2 {
        return None;
    }
    let baht: i64 = if baht_str.is_empty() {
        0
    } else {
        baht_str.parse().ok()?
    };
    let satang: i64 = match frac.len() {
        0 => 0,
        1 => frac.parse::<i64>().ok()? * 10,
        _ => frac.parse().ok()?,
    };
    baht.checked_mul(100)?.checked_add(satang)
}

#[derive(Debug)]
struct AmountHit {
    satang: i64,
    currency: bool,
    decimal: bool,
}

/// Finds amounts on one line. A bare integer is only accepted when it stands
/// alone, so digits inside dates, times, account masks and references are
/// skipped.
fn scan_amounts(line: &str) -> Vec<AmountHit> {
    let mut out = Vec::new();
    for caps in AMOUNT_RE.captures_iter(line) {
        let Some(num) = caps.get(2) else { continue };
        let before = line[..num.start()].chars().next_back();
        let after = line[num.end()..].chars().next();
        if before.is_some_and(|c| c.is_ascii_alphanumeric() || matches!(c, ':' | '/' | '-')) {
            continue;
        }
        if after.is_some_and(|c| c.is_ascii_alphanumeric() || matches!(c, ':' | '/' | '-' | '.')) {
            continue;
        }
        let number = num.as_str();
        // Skip Thai time rendered with dot instead of colon, e.g. "19.51 u." or "19.51 น."
        let tail_lower = line[num.end()..].trim_start().to_lowercase();
        if tail_lower.starts_with("u.") || tail_lower.starts_with("น.") {
            continue;
        }
        let decimal = number.contains('.');
        let plain = !decimal && !number.contains(',');
        if plain && number.len() >= 7 {
            continue; // a reference number, not an amount
        }
        let Some(satang) = to_satang(number) else {
            continue;
        };
        out.push(AmountHit {
            satang,
            currency: caps.get(1).is_some() || caps.get(3).is_some(),
            decimal,
        });
    }
    out
}

/// Picks the main transfer amount. Balance and fee lines are skipped. Lines
/// with an amount label, a currency marker or decimals score higher. Positive
/// amounts always beat 0.00 (which is usually a fee line).
fn find_main_amount(lines: &[String]) -> Option<i64> {
    let mut best: Option<(u8, i64)> = None;
    for line in lines {
        let lower = line.to_lowercase();
        if contains_any(&lower, BALANCE_KEYS) || contains_any(&lower, FEE_KEYS) {
            continue;
        }
        let keyword = contains_any(&lower, AMOUNT_KEYS);
        for hit in scan_amounts(line) {
            if !(keyword || hit.currency || hit.decimal) {
                continue;
            }
            if hit.satang <= 0 {
                continue;
            }
            let score = u8::from(keyword) * 4 + u8::from(hit.currency) * 2 + u8::from(hit.decimal);
            if best.is_none_or(|(s, _)| score > s) {
                best = Some((score, hit.satang));
            }
        }
    }
    best.map(|(_, satang)| satang)
}

fn find_fee(lines: &[String]) -> Option<i64> {
    lines.iter().find_map(|line| {
        let lower = line.to_lowercase();
        if !contains_any(&lower, FEE_KEYS) {
            return None;
        }
        scan_amounts(line).first().map(|hit| hit.satang)
    })
}

/// Two-digit years from this value up are always Buddhist Era: as CE they would be 2050+,
/// and as BE (`25yy`) they are 2007 to 2056 CE.
const TWO_DIGIT_BE_FROM: i32 = 50;

/// Maps a two-digit year to CE. Four-digit years >= 2400 are Buddhist Era.
/// Two-digit years are BE (`25yy`) when `two_digit_is_be` is set or the year is at least
/// [`TWO_DIGIT_BE_FROM`], otherwise CE (`20yy`).
pub(crate) fn year_to_ce(year: i32, two_digit_is_be: bool) -> i32 {
    if year >= 2400 {
        year - 543
    } else if year < 100 {
        if two_digit_is_be || year >= TWO_DIGIT_BE_FROM {
            2500 + year - 543
        } else {
            2000 + year
        }
    } else {
        year
    }
}

fn ymd(year: i32, month: u32, day: u32) -> Option<String> {
    NaiveDate::from_ymd_opt(year, month, day).map(|d| d.format("%Y-%m-%d").to_string())
}

fn thai_month_number(token: &str) -> Option<u32> {
    let dotless = token.replace('.', "");
    THAI_MONTHS
        .iter()
        .find(|(tok, _)| tok.replace('.', "") == dotless)
        .map(|(_, m)| *m)
}

fn english_month_number(token: &str) -> Option<u32> {
    let abbr: String = token.chars().take(3).collect::<String>().to_lowercase();
    match abbr.as_str() {
        "jan" => Some(1),
        "feb" => Some(2),
        "mar" => Some(3),
        "apr" => Some(4),
        "may" => Some(5),
        "jun" => Some(6),
        "jul" => Some(7),
        "aug" => Some(8),
        "sep" => Some(9),
        "oct" => Some(10),
        "nov" => Some(11),
        "dec" => Some(12),
        _ => None,
    }
}

// Each extractor returns the first valid date on the line.
// The `bool` is whether the surrounding text contains Thai script.

fn thai_month_date(line: &str, _thai: bool) -> Option<String> {
    THAI_DATE_RE.captures_iter(line).find_map(|caps| {
        let day: u32 = caps[1].parse().ok()?;
        let month = thai_month_number(&caps[2])?;
        let year = year_to_ce(caps[3].parse().ok()?, true);
        ymd(year, month, day)
    })
}

fn english_month_date(line: &str, _thai: bool) -> Option<String> {
    ENGLISH_DATE_RE.captures_iter(line).find_map(|caps| {
        let day: u32 = caps[1].parse().ok()?;
        let month = english_month_number(&caps[2])?;
        let year = year_to_ce(caps[3].parse().ok()?, false);
        ymd(year, month, day)
    })
}

fn english_month_first_date(line: &str, _thai: bool) -> Option<String> {
    ENGLISH_MONTH_FIRST_RE.captures_iter(line).find_map(|caps| {
        let month = english_month_number(&caps[1])?;
        let day: u32 = caps[2].parse().ok()?;
        let year = year_to_ce(caps[3].parse().ok()?, false);
        ymd(year, month, day)
    })
}

fn iso_date(line: &str, _thai: bool) -> Option<String> {
    ISO_DATE_RE.captures_iter(line).find_map(|caps| {
        let year = year_to_ce(caps[1].parse().ok()?, false);
        let month: u32 = caps[2].parse().ok()?;
        let day: u32 = caps[3].parse().ok()?;
        ymd(year, month, day)
    })
}

/// `dd/mm/yyyy` (or `dd/mm/yy`, which is BE in a Thai context).
fn numeric_date(line: &str, thai: bool) -> Option<String> {
    NUMERIC_DATE_RE.captures_iter(line).find_map(|caps| {
        let day: u32 = caps[1].parse().ok()?;
        let month: u32 = caps[2].parse().ok()?;
        let year = year_to_ce(caps[3].parse().ok()?, thai);
        ymd(year, month, day)
    })
}

fn find_time(line: &str) -> Option<String> {
    TIME_RE.captures_iter(line).find_map(|caps| {
        let start = caps.get(0)?.start();
        // Skip matches that are the tail of a longer number.
        if line[..start]
            .chars()
            .next_back()
            .is_some_and(|c| c.is_ascii_digit())
        {
            return None;
        }
        let mut hour: u32 = caps[1].parse().ok()?;
        let minute: u32 = caps[2].parse().ok()?;
        if let Some(meridiem) = caps.get(3).map(|m| m.as_str().to_lowercase()) {
            if hour == 0 || hour > 12 {
                return None;
            }
            if meridiem == "pm" && hour != 12 {
                hour += 12;
            } else if meridiem == "am" && hour == 12 {
                hour = 0;
            }
        }
        (hour < 24 && minute < 60).then(|| format!("{hour:02}:{minute:02}"))
    })
}

/// Returns the date and time. The time is taken from the date's line when
/// possible.
fn find_date_time(lines: &[String], thai: bool) -> (Option<String>, Option<String>) {
    let extractors: [fn(&str, bool) -> Option<String>; 5] = [
        thai_month_date,
        english_month_date,
        english_month_first_date,
        iso_date,
        numeric_date,
    ];
    let any_time = || lines.iter().find_map(|l| find_time(l));
    for extract in extractors {
        let hit = lines
            .iter()
            .enumerate()
            .find_map(|(i, line)| extract(line, thai).map(|d| (i, d)));
        if let Some((idx, ymd)) = hit {
            let time = find_time(&lines[idx]).or_else(any_time);
            return (Some(ymd), time);
        }
    }
    (None, any_time())
}

/// Returns the remainder after a label (case-insensitive). The label must end
/// at a boundary: end of line, whitespace or `:`.
fn strip_label<'a>(line: &'a str, labels: &[&str]) -> Option<&'a str> {
    for label in labels {
        let n = label.len();
        if line.len() < n || !line.is_char_boundary(n) {
            continue;
        }
        if line[..n].to_lowercase() != *label {
            continue;
        }
        let rest = &line[n..];
        match rest.chars().next() {
            None => return Some(""),
            Some(c) if c.is_whitespace() || c == ':' => {
                return Some(rest.trim_start_matches(|c: char| c.is_whitespace() || c == ':'));
            }
            Some(_) => continue,
        }
    }
    None
}

fn is_label_line(line: &str) -> bool {
    strip_label(line, SENDER_LABELS).is_some()
        || strip_label(line, RECEIVER_LABELS).is_some()
        || strip_label(line, MEMO_LABELS).is_some()
}

/// A token is account-like when it contains a digit (`1234`) or is a pure mask
/// (`XXX-X-X`).
fn is_masked_token(token: &str) -> bool {
    token.chars().any(|c| c.is_ascii_digit())
        || (token.len() >= 2
            && token
                .chars()
                .all(|c| matches!(c, 'x' | 'X' | '-' | '*' | '•')))
}

fn clean_name(text: &str) -> Option<String> {
    let kept: Vec<&str> = text
        .split_whitespace()
        .filter(|t| !is_masked_token(t))
        .collect();
    let joined = kept.join(" ");
    let trimmed = joined
        .trim_matches(|c: char| c.is_ascii_punctuation() || c.is_whitespace() || c == '•')
        .trim();
    if trimmed.is_empty() || trimmed.chars().filter(|c| c.is_alphabetic()).count() < 2 {
        return None;
    }
    let lower = trimmed.to_lowercase();
    if EXACT_NOISE_LINES.contains(&lower.as_str()) {
        return None;
    }
    if contains_any(&lower, NAME_REJECT)
        || contains_any(&lower, BALANCE_KEYS)
        || contains_any(&lower, FEE_KEYS)
        || thai_month_date(trimmed, false).is_some()
        || english_month_date(trimmed, false).is_some()
        || find_time(trimmed).is_some()
        || !scan_amounts(trimmed).is_empty()
    {
        return None;
    }
    Some(trimmed.to_string())
}

fn extract_masked_account_last4(line: &str) -> Option<String> {
    let caps = MASKED_ACCT_RE.captures(line)?;
    let digits = caps.get(1)?.as_str();
    if digits.len() >= 3 {
        Some(digits.to_string())
    } else {
        None
    }
}

/// A lone token of at most three Latin letters, such as `UUD`. This is how ML Kit
/// reads the bank or shop icon printed beside a name, so it is never a name.
fn is_icon_noise(line: &str) -> bool {
    let t = line.trim();
    t.chars().count() <= 3 && t.chars().all(|c| c.is_ascii_alphabetic())
}

/// Receiver name from the lines between the sender's and the receiver's masked
/// accounts. Walks up from the receiver's account, skipping icon noise, and keeps
/// the line above the name too when the name wraps onto a second line.
fn positional_receiver(between: &[String]) -> Option<String> {
    let mut parts: Vec<String> = Vec::new();
    for line in between.iter().rev().filter(|l| !is_icon_noise(l)).take(4) {
        match clean_name(line) {
            Some(name) => {
                parts.push(name);
                if parts.len() == 2 {
                    break;
                }
            }
            None if parts.is_empty() => continue,
            None => break,
        }
    }
    parts.reverse();
    (!parts.is_empty()).then(|| parts.join(" "))
}

/// Extracts `(sender_name, receiver_name, sender_last4, receiver_last4)` from
/// masked-account positional structure (handles K PLUS label-less slips,
/// Dime! two-column slips, Krungthai NEXT, etc.).
fn extract_parties_positional(
    lines: &[String],
) -> (Option<String>, Option<String>, Option<String>, Option<String>) {
    let masked: Vec<(usize, String)> = lines
        .iter()
        .enumerate()
        .filter_map(|(i, l)| extract_masked_account_last4(l).map(|d| (i, d)))
        .collect();

    if masked.is_empty() {
        return (None, None, None, None);
    }

    let (first_idx, first_last4) = &masked[0];
    // Walk backwards from first masked account to find sender name
    let sender = (0..*first_idx)
        .rev()
        .take(4)
        .find_map(|i| clean_name(&lines[i]));

    if masked.len() >= 2 {
        let (second_idx, second_last4) = &masked[1];
        // Check if the 2nd masked line is a 16-digit credit card biller (e.g. 4417-7Oxx-XXXX-2726)
        let second_line = &lines[*second_idx];
        let is_card_biller = second_line.chars().filter(|c| c.is_ascii_digit()).count() >= 7
            && lines.iter().any(|l| l.to_lowercase().contains("payment completed"));
        if is_card_biller {
            // Line directly above credit card number is the card product name (e.g. "KBank PLUSTINUM")
            let card_name = ((*first_idx + 1)..*second_idx)
                .rev()
                .find_map(|i| {
                    let s = lines[i].trim();
                    (s.split_whitespace().count() >= 2
                        && s.chars().filter(|c| c.is_alphabetic()).count() >= 4)
                        .then(|| s.to_string())
                });
            return (sender, card_name, Some(first_last4.clone()), None);
        }
        let receiver = positional_receiver(&lines[*first_idx + 1..*second_idx]);
        return (
            sender,
            receiver,
            Some(first_last4.clone()),
            Some(second_last4.clone()),
        );
    }

    // Single masked account (e.g. K PLUS Payment / Top-Up to merchant/biller):
    // Walk forwards after the first masked account, collecting merchant lines.
    // Also check if OCR placed a merchant name line immediately between bank & account
    // (like "5 BANGKOK SMARTCARD" before "XXX-X-Xx1234-x" + "SYSTEM COMPANY LIMITED" after).
    let mut merchant_parts: Vec<String> = Vec::new();
    if *first_idx >= 1 {
        let prev = lines[*first_idx - 1].trim();
        let prev_clean = prev.trim_start_matches(|c: char| c.is_ascii_digit() || c.is_whitespace());
        if let Some(prev_name) = clean_name(prev_clean) {
            if sender.as_deref() != Some(prev_name.as_str()) {
                merchant_parts.push(prev_name);
            }
        }
    }
    for line in lines.iter().skip(*first_idx + 1).take(4) {
        let lower = line.to_lowercase();
        if contains_any(&lower, AMOUNT_KEYS)
            || contains_any(&lower, REF_LABELS)
            || contains_any(&lower, MEMO_LABELS)
        {
            break;
        }
        // Allow merchant names that include a bank prefix like "KBank PLUSTINUM"
        let trimmed = line.trim();
        let is_card_or_merchant = trimmed.split_whitespace().count() >= 2
            && trimmed.chars().filter(|c| c.is_alphabetic()).count() >= 4
            && !contains_any(&lower, &["scan for", "verify slip", "transfer completed", "payment completed"])
            && !is_masked_token(trimmed)
            && scan_amounts(trimmed).is_empty()
            && extract_masked_account_last4(trimmed).is_none();
        if let Some(name) = clean_name(trimmed) {
            merchant_parts.push(name);
            if merchant_parts.len() >= 2 {
                break;
            }
        } else if is_card_or_merchant && merchant_parts.is_empty() {
            merchant_parts.push(trimmed.to_string());
            break;
        }
    }
    let receiver = if merchant_parts.is_empty() {
        None
    } else {
        Some(merchant_parts.join(" "))
    };
    (sender, receiver, Some(first_last4.clone()), None)
}

fn clean_memo(text: &str) -> Option<String> {
    let trimmed = text.trim();
    if !trimmed.chars().any(char::is_alphanumeric) || is_label_line(trimmed) {
        return None;
    }
    // Looks like an account or reference line, not a note.
    let digits = trimmed.chars().filter(|c| c.is_ascii_digit()).count();
    if digits >= 6 && !trimmed.chars().any(char::is_alphabetic) {
        return None;
    }
    Some(trimmed.to_string())
}

/// Finds the value for a label: the inline remainder, or the first usable line
/// below it (names look up to 3 lines, memos only the next line). Stops at the
/// next label.
fn value_after_label(lines: &[String], idx: usize, inline: &str, is_name: bool) -> Option<String> {
    let accept = |text: &str| {
        if is_name {
            clean_name(text)
        } else {
            clean_memo(text)
        }
    };
    if !inline.is_empty() {
        return accept(inline);
    }
    let lookahead = if is_name { 3 } else { 1 };
    for line in lines.iter().skip(idx + 1).take(lookahead) {
        if is_label_line(line) {
            return None;
        }
        if let Some(value) = accept(line) {
            return Some(value);
        }
    }
    None
}

fn find_party(lines: &[String], labels: &[&str], is_name: bool) -> Option<String> {
    lines.iter().enumerate().find_map(|(i, line)| {
        let rest = strip_label(line, labels)?;
        value_after_label(lines, i, rest, is_name)
    })
}

fn find_trans_ref(lines: &[String]) -> Option<String> {
    for (i, line) in lines.iter().enumerate() {
        let lower = line.to_lowercase();
        if !contains_any(&lower, REF_LABELS) {
            continue;
        }
        let next = lines.get(i + 1).map(String::as_str).unwrap_or("");
        for candidate in [line.as_str(), next] {
            let token = REF_TOKEN_RE
                .find_iter(candidate)
                .map(|m| m.as_str())
                .find(|t| t.chars().any(|c| c.is_ascii_digit()));
            if let Some(token) = token {
                return Some(token.to_string());
            }
        }
    }
    None
}

/// Finds a bank by name or keyword in the given lines. Returns the slug of the
/// first match.
fn find_bank_in_lines<'a>(lines: impl Iterator<Item = &'a String>) -> Option<String> {
    for line in lines {
        let lower = line.to_lowercase();
        for bank in banks::ALL_BANKS {
            let hit = [bank.name_en, bank.name_th]
                .into_iter()
                .chain(bank.album_keywords.iter().copied())
                .any(|kw| !kw.is_empty() && lower.contains(kw.to_lowercase().as_str()));
            if hit {
                return Some(bank.id.to_string());
            }
        }
    }
    None
}

/// Bank slug from the QR's BOT code, then from the OCR text (the header is
/// searched first, because a receiver's bank can also appear lower down), then
/// from the album name. Shared albums are skipped for the album step.
fn detect_bank(
    lines: &[String],
    qr: Option<&ParsedQr>,
    album_hint: Option<&str>,
) -> Option<String> {
    let qr_bank = qr
        .and_then(|q| q.sending_bank.as_deref())
        .and_then(banks::bank_by_bot_code);
    if let Some(bank) = qr_bank {
        return Some(bank.id.to_string());
    }
    let by_text =
        find_bank_in_lines(lines.iter().take(4)).or_else(|| find_bank_in_lines(lines.iter()));
    if by_text.is_some() {
        return by_text;
    }
    let hint = album_hint?.to_lowercase();
    banks::ALL_BANKS
        .iter()
        .find(|bank| {
            !bank.uses_shared_album && bank.album_keywords.iter().any(|k| hint.contains(*k))
        })
        .map(|bank| bank.id.to_string())
}

/// Lowercases a name, strips honorifics and punctuation, and joins the tokens
/// with no spaces. Used for substring matching.
fn name_tokens(text: &str) -> Vec<String> {
    text.split_whitespace()
        .filter_map(|raw| {
            let lower = raw.to_lowercase();
            let no_dots: String = lower.chars().filter(|c| *c != '.').collect();
            if HONORIFICS_EN.contains(&no_dots.as_str()) {
                return None;
            }
            if HONORIFICS_TH.iter().any(|h| no_dots == h.replace('.', "")) {
                return None;
            }
            let mut stripped = no_dots.as_str();
            for h in HONORIFICS_TH {
                let h = h.replace('.', "");
                if stripped.len() > h.len() && stripped.starts_with(&h) {
                    stripped = &stripped[h.len()..];
                    break;
                }
            }
            let cleaned: String = stripped
                .chars()
                .filter(|c| !c.is_ascii_punctuation())
                .collect();
            (!cleaned.is_empty()).then_some(cleaned)
        })
        .collect()
}

fn normalize_name(text: &str) -> String {
    name_tokens(text).concat()
}

fn token_matches(a: &str, b: &str) -> bool {
    if a == b {
        return true;
    }
    // Handle abbreviated surname initials on K PLUS slips: e.g. "k" matches "kongdee"
    (a.len() == 1 && b.len() >= 3 && b.starts_with(a))
        || (b.len() == 1 && a.len() >= 3 && a.starts_with(b))
}

fn detect_self_transfer(
    sender: Option<&str>,
    receiver: Option<&str>,
    owner_names: &[String],
) -> bool {
    let Some(receiver) = receiver else {
        return false;
    };
    let recv_norm = normalize_name(receiver);
    if recv_norm.is_empty() {
        return false;
    }
    for owner in owner_names {
        let owner_norm = normalize_name(owner);
        if owner_norm.len() < 2 {
            continue;
        }
        if recv_norm.contains(&owner_norm)
            || (recv_norm.len() >= 4 && owner_norm.contains(&recv_norm))
        {
            return true;
        }
    }
    if let Some(sender) = sender {
        let sender_tokens = name_tokens(sender);
        let recv_tokens = name_tokens(receiver);
        if !sender_tokens.is_empty() && !recv_tokens.is_empty() {
            // Require at least one full-word match (len >= 3) so random initials don't collide
            let has_full_word_match = sender_tokens
                .iter()
                .any(|t| t.len() >= 3 && recv_tokens.iter().any(|r| r == t));
            if has_full_word_match {
                let shared = sender_tokens
                    .iter()
                    .filter(|t| recv_tokens.iter().any(|r| token_matches(t, r)))
                    .count();
                let smaller = sender_tokens.len().min(recv_tokens.len());
                if shared * 2 > smaller {
                    return true;
                }
            }
        }
    }
    false
}

fn looks_mojibake(text: &str) -> bool {
    let weird_latin = text
        .chars()
        .filter(|c| ('\u{0080}'..='\u{02AF}').contains(c) || ('\u{1E00}'..='\u{1EFF}').contains(c))
        .count();
    text.contains('\u{FFFD}') || text.contains("à¸") || text.contains("à¹") || weird_latin >= 3
}

fn detect_non_slip(text: &str, qr: Option<&ParsedQr>) -> bool {
    if qr.is_some() {
        return false;
    }
    let lower = text.to_lowercase();
    contains_any(&lower, NON_SLIP_KEYS)
}

/// Parses OCR text from a slip into structured fields.
///
/// `qr` supplies the authoritative bank code, transaction reference and (for
/// TrueMoney) the date fallback. `owner_names` drives self-transfer detection.
/// `album_hint` is the album or folder name, used only as a last-resort bank
/// hint for non-shared albums.
pub fn parse_slip_text(
    ocr_text: &str,
    qr: Option<&ParsedQr>,
    owner_names: &[String],
    album_hint: Option<&str>,
) -> ParsedSlipData {
    let text = normalize_text(ocr_text);
    let lines = lines_of(&text);
    let has_thai_script = text.chars().any(is_thai_char);

    let amount_satang = find_main_amount(&lines);
    let fee_satang = find_fee(&lines);
    let (ocr_date, occurred_time) = find_date_time(&lines, has_thai_script);
    let occurred_date = ocr_date.or_else(|| qr.and_then(|q| q.qr_date_ymd.clone()));
    let (pos_sender, pos_receiver, sender_acct_last4, receiver_acct_last4) =
        extract_parties_positional(&lines);
    let sender_name = find_party(&lines, SENDER_LABELS, true).or(pos_sender);
    let receiver_name = find_party(&lines, RECEIVER_LABELS, true).or(pos_receiver);
    let memo = find_party(&lines, MEMO_LABELS, false);
    let bank_id = detect_bank(&lines, qr, album_hint);
    let trans_ref = qr
        .map(|q| q.trans_ref.clone())
        .filter(|r| !r.is_empty())
        .or_else(|| find_trans_ref(&lines));
    let self_transfer = detect_self_transfer(
        sender_name.as_deref(),
        receiver_name.as_deref(),
        owner_names,
    );
    let is_non_slip = detect_non_slip(&text, qr);

    let mojibake = looks_mojibake(&text);
    let sparse = lines.len() < 3;
    let needs_thai_ocr = amount_satang.is_none()
        || receiver_name.is_none()
        || occurred_date.is_none()
        || mojibake
        || sparse;

    let mut confidence = 0.0_f32;
    if amount_satang.is_some() {
        confidence += 0.35;
    }
    if occurred_date.is_some() {
        confidence += 0.2;
    }
    if receiver_name.is_some() {
        confidence += 0.15;
    }
    if sender_name.is_some() {
        confidence += 0.1;
    }
    if trans_ref.is_some() {
        confidence += 0.1;
    }
    if bank_id.is_some() {
        confidence += 0.05;
    }
    if occurred_time.is_some() {
        confidence += 0.05;
    }
    if mojibake {
        confidence -= 0.3;
    }

    ParsedSlipData {
        amount_satang,
        fee_satang,
        occurred_date,
        occurred_time,
        sender_name,
        receiver_name,
        sender_acct_last4,
        receiver_acct_last4,
        memo,
        bank_id,
        trans_ref,
        is_self_transfer: self_transfer,
        is_non_slip,
        has_thai_script,
        confidence: confidence.clamp(0.0, 1.0),
        needs_thai_ocr,
    }
}

// ---------------------------------------------------------------------------
// AksonOCR client
// ---------------------------------------------------------------------------

/// Sends an image to AksonOCR and returns the extracted text (markdown or
/// plain text). An empty `model` falls back to [`DEFAULT_AKSON_OCR_MODEL`].
pub async fn call_akson_ocr(
    image_bytes: &[u8],
    mime_type: &str,
    api_key: &str,
    model: &str,
) -> Result<String, String> {
    if image_bytes.is_empty() {
        return Err("no image bytes to OCR".into());
    }
    if api_key.trim().is_empty() {
        return Err("missing AksonOCR API key".into());
    }
    let model = if model.trim().is_empty() {
        DEFAULT_AKSON_OCR_MODEL
    } else {
        model
    };

    let encoded = base64::engine::general_purpose::STANDARD.encode(image_bytes);
    let body = serde_json::json!({
        "model": model,
        "document": {
            "type": "image_url",
            "image_url": format!("data:{mime_type};base64,{encoded}"),
        },
    });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(90))
        .build()
        .map_err(|e| format!("could not build HTTP client: {e}"))?;
    let response = client
        .post(AKSON_OCR_ENDPOINT)
        .header("X-API-Key", api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("AksonOCR request failed: {e}"))?;

    let status = response.status();
    let text = response
        .text()
        .await
        .map_err(|e| format!("could not read AksonOCR response: {e}"))?;
    if !status.is_success() {
        let snippet: String = text.chars().take(300).collect();
        return Err(format!("AksonOCR returned HTTP {status}: {snippet}"));
    }
    extract_ocr_text(&text)
}

/// Pulls text out of an AksonOCR response body. Accepts a plain-text or
/// markdown body, or a JSON object with `text`, `markdown`, `pages[].markdown`
/// (or `pages[].text`), or `data.text` / `data.markdown`.
fn extract_ocr_text(body: &str) -> Result<String, String> {
    let trimmed = body.trim();
    if trimmed.is_empty() {
        return Err("AksonOCR returned an empty body".into());
    }
    let value: serde_json::Value = match serde_json::from_str(trimmed) {
        Ok(value) => value,
        Err(_) => return Ok(trimmed.to_string()),
    };
    let non_empty = |s: &str| -> Result<String, String> {
        let s = s.trim();
        if s.is_empty() {
            Err("AksonOCR returned no text".into())
        } else {
            Ok(s.to_string())
        }
    };

    if let Some(s) = value.as_str() {
        return non_empty(s);
    }
    for key in ["text", "markdown"] {
        if let Some(s) = value.get(key).and_then(serde_json::Value::as_str) {
            return non_empty(s);
        }
    }
    if let Some(pages) = value.get("pages").and_then(serde_json::Value::as_array) {
        let joined = pages
            .iter()
            .filter_map(|page| {
                page.get("markdown")
                    .or_else(|| page.get("text"))
                    .and_then(serde_json::Value::as_str)
            })
            .collect::<Vec<_>>()
            .join("\n\n");
        return non_empty(&joined);
    }
    if let Some(data) = value.get("data") {
        for key in ["text", "markdown"] {
            if let Some(s) = data.get(key).and_then(serde_json::Value::as_str) {
                return non_empty(s);
            }
        }
    }
    Err("unrecognised AksonOCR response shape".into())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn owners(names: &[&str]) -> Vec<String> {
        names.iter().map(|s| s.to_string()).collect()
    }

    fn parse(text: &str) -> ParsedSlipData {
        parse_slip_text(text, None, &[], None)
    }

    fn date_of(text: &str) -> Option<String> {
        parse(text).occurred_date
    }

    // --- CRC primitive -----------------------------------------------------

    #[test]
    fn crc16_matches_standard_check_value() {
        assert_eq!(crc16_ccitt_false(b"123456789"), 0x29B1);
    }

    // --- BOT Slip-Verify QR ------------------------------------------------

    // Generated with an independent CRC implementation.
    const BOT_SLIP_OK: &str = "0041000600000101030140220A1B2C3D4E5F6G7H8I9J05102TH91042298";

    #[test]
    fn bot_qr_parses_and_verifies_crc() {
        let qr = parse_slip_qr(BOT_SLIP_OK).expect("valid BOT QR");
        assert_eq!(qr.kind, QrKind::BotSlipVerify);
        assert_eq!(qr.sending_bank.as_deref(), Some("014"));
        assert_eq!(qr.trans_ref, "A1B2C3D4E5F6G7H8I9J0");
        assert_eq!(qr.qr_date_ymd, None);
        assert!(qr.crc_valid);
    }

    #[test]
    fn bot_qr_with_wrong_crc_still_parses_but_is_flagged() {
        let tampered = "0041000600000101030140220A1B2C3D4E5F6G7H8I9J05102TH91042290";
        let qr = parse_slip_qr(tampered).expect("structure is still valid");
        assert!(!qr.crc_valid);
        assert_eq!(qr.trans_ref, "A1B2C3D4E5F6G7H8I9J0");
    }

    #[test]
    fn scb_three_char_crc_is_left_padded_and_verified() {
        // CRC is 0x047D, transmitted as "47D" in a tag-91 with length 03.
        let scb = "0041000600000101030140220SCB000000000000000855102TH910347D";
        let qr = parse_slip_qr(scb).expect("valid SCB QR");
        assert_eq!(qr.kind, QrKind::BotSlipVerify);
        assert_eq!(qr.sending_bank.as_deref(), Some("014"));
        assert_eq!(qr.trans_ref, "SCB00000000000000085");
        assert!(qr.crc_valid);
    }

    #[test]
    fn bot_qr_tolerates_missing_crc() {
        let no_crc = "0041000600000101030140220A1B2C3D4E5F6G7H8I9J05102TH";
        let qr = parse_slip_qr(no_crc).expect("parses without tag 91");
        assert!(!qr.crc_valid);
    }

    // --- TrueMoney QR ------------------------------------------------------

    const TRUEMONEY_OK: &str = "00470002010102010205EVT010310TXN12345670408211120269104c69f";

    #[test]
    fn truemoney_qr_parses_date_and_ref() {
        let qr = parse_slip_qr(TRUEMONEY_OK).expect("valid TrueMoney QR");
        assert_eq!(qr.kind, QrKind::TrueMoneySlip);
        assert_eq!(qr.sending_bank, None);
        assert_eq!(qr.trans_ref, "TXN1234567");
        assert_eq!(qr.qr_date_ymd.as_deref(), Some("2026-11-21"));
        assert!(qr.crc_valid);
    }

    #[test]
    fn truemoney_qr_converts_buddhist_era_date() {
        let be = "00470002010102010205EVT010310TXN12345670408211125699104dc60";
        let qr = parse_slip_qr(be).expect("valid TrueMoney QR");
        assert_eq!(qr.qr_date_ymd.as_deref(), Some("2026-11-21"));
        assert!(qr.crc_valid);
    }

    // --- Rejections --------------------------------------------------------

    #[test]
    fn promptpay_payment_qr_is_rejected() {
        let promptpay = "00020101021153037645802TH6304CE37";
        let err = parse_slip_qr(promptpay).expect_err("PromptPay must be rejected");
        assert!(err.contains("PromptPay"), "unexpected error: {err}");
    }

    #[test]
    fn non_tlv_text_is_rejected() {
        assert!(parse_slip_qr("https://example.com/not-a-slip").is_err());
        assert!(parse_slip_qr("").is_err());
    }

    #[test]
    fn truncated_tlv_is_rejected() {
        assert!(parse_slip_qr("0041000600").is_err());
    }

    // --- Year and date conversion ------------------------------------------

    #[test]
    fn buddhist_era_years_convert_to_ce() {
        assert_eq!(year_to_ce(2569, false), 2026);
        assert_eq!(year_to_ce(2026, false), 2026);
        assert_eq!(year_to_ce(69, true), 2026);
        assert_eq!(year_to_ce(67, true), 2024);
        assert_eq!(year_to_ce(99, true), 2056);
        assert_eq!(year_to_ce(26, false), 2026);
    }

    #[test]
    fn thai_abbreviated_month_with_two_digit_be_year() {
        let text = "โอนเงินสำเร็จ\n21 พ.ย. 69 17:28\nจำนวนเงิน 523.00 บาท";
        let parsed = parse(text);
        assert_eq!(parsed.occurred_date.as_deref(), Some("2026-11-21"));
        assert_eq!(parsed.occurred_time.as_deref(), Some("17:28"));
    }

    #[test]
    fn thai_abbreviated_month_with_four_digit_be_year() {
        assert_eq!(date_of("21 พ.ย. 2569").as_deref(), Some("2026-11-21"));
    }

    #[test]
    fn thai_full_month_name_with_be_year() {
        assert_eq!(date_of("21 พฤศจิกายน 2569").as_deref(), Some("2026-11-21"));
    }

    #[test]
    fn english_dates_in_common_formats() {
        assert_eq!(date_of("21 Nov 26 17:28").as_deref(), Some("2026-11-21"));
        assert_eq!(date_of("21 Nov 2026").as_deref(), Some("2026-11-21"));
        assert_eq!(date_of("21 November 2026").as_deref(), Some("2026-11-21"));
        assert_eq!(date_of("Nov 21, 2026").as_deref(), Some("2026-11-21"));
        assert_eq!(date_of("2026-11-21").as_deref(), Some("2026-11-21"));
    }

    #[test]
    fn two_digit_be_year_on_an_english_slip_is_not_read_as_2069() {
        // Thai banks print short Buddhist-Era years on English slips too.
        assert_eq!(date_of("21 Nov 69 17:28").as_deref(), Some("2026-11-21"));
        assert_eq!(date_of("Date 21/11/69").as_deref(), Some("2026-11-21"));
        // Short CE years still work.
        assert_eq!(date_of("21 Nov 26 17:28").as_deref(), Some("2026-11-21"));
    }

    #[test]
    fn numeric_dates_with_be_and_ce_years() {
        assert_eq!(date_of("21/11/2569").as_deref(), Some("2026-11-21"));
        assert_eq!(date_of("21/11/2026").as_deref(), Some("2026-11-21"));
    }

    #[test]
    fn invalid_calendar_date_is_ignored() {
        assert_eq!(date_of("31 Feb 2026"), None);
    }

    #[test]
    fn date_taken_from_truemoney_qr_when_ocr_has_none() {
        let qr = parse_slip_qr(TRUEMONEY_OK).expect("valid");
        let parsed = parse_slip_text("Transfer\nAmount 50.00 THB", Some(&qr), &[], None);
        assert_eq!(parsed.occurred_date.as_deref(), Some("2026-11-21"));
        assert_eq!(parsed.trans_ref.as_deref(), Some("TXN1234567"));
    }

    // --- Amounts -----------------------------------------------------------

    #[test]
    fn amount_with_thousands_separator_and_currency_suffix() {
        assert_eq!(parse("Amount 2,922.50 THB").amount_satang, Some(292_250));
        assert_eq!(parse("จำนวนเงิน 523.00 บาท").amount_satang, Some(52_300));
    }

    #[test]
    fn amount_with_currency_prefix() {
        assert_eq!(parse("THB 1,200.00").amount_satang, Some(120_000));
        assert_eq!(parse("฿60.00").amount_satang, Some(6_000));
    }

    #[test]
    fn fee_lines_are_not_taken_as_the_main_amount() {
        let text = "ค่าธรรมเนียม 0.00\nจำนวนเงิน 523.00 บาท";
        let parsed = parse(text);
        assert_eq!(parsed.amount_satang, Some(52_300));
        assert_eq!(parsed.fee_satang, Some(0));

        let english = "Fee 15.00 THB\nAmount 1,200.00 THB";
        let parsed = parse(english);
        assert_eq!(parsed.amount_satang, Some(120_000));
        assert_eq!(parsed.fee_satang, Some(1_500));
    }

    #[test]
    fn balance_lines_are_not_taken_as_the_main_amount() {
        let text = "Amount 100.00 THB\nAvailable balance 9,999.99 THB";
        assert_eq!(parse(text).amount_satang, Some(10_000));
    }

    #[test]
    fn times_and_account_masks_are_not_amounts() {
        let text = "21 Nov 26 17:28\nxxx-x-x1234-x";
        assert_eq!(parse(text).amount_satang, None);
    }

    // --- English slips -----------------------------------------------------

    const KPLUS_EN: &str = "\
K PLUS
Transfer Successful
21 Nov 26 17:28
From
MR. SOMCHAI JAIDEE
XXX-X-X1234-X
To
MS. SOMYING DEE
XXX-X-X5678-X
Amount 2,922.50 THB
Fee 0.00 THB
Memo
Lunch
Ref. 202611211728ABC12";

    #[test]
    fn english_kplus_slip_parses_all_fields() {
        let parsed = parse(KPLUS_EN);
        assert_eq!(parsed.amount_satang, Some(292_250));
        assert_eq!(parsed.fee_satang, Some(0));
        assert_eq!(parsed.occurred_date.as_deref(), Some("2026-11-21"));
        assert_eq!(parsed.occurred_time.as_deref(), Some("17:28"));
        assert_eq!(parsed.sender_name.as_deref(), Some("MR. SOMCHAI JAIDEE"));
        assert_eq!(parsed.receiver_name.as_deref(), Some("MS. SOMYING DEE"));
        assert_eq!(parsed.memo.as_deref(), Some("Lunch"));
        assert_eq!(parsed.bank_id.as_deref(), Some("kbank"));
        assert_eq!(parsed.trans_ref.as_deref(), Some("202611211728ABC12"));
        assert!(!parsed.has_thai_script);
        assert!(!parsed.is_self_transfer);
        assert!(!parsed.needs_thai_ocr);
        assert!(parsed.confidence > 0.9);
    }

    #[test]
    fn english_scb_slip_detects_bank_and_date_from_header() {
        let text = "\
SCB
Transfer Successful
21 Nov 2026 17:28
From
MR. SOMCHAI JAIDEE
xxx-x-x1234-x
To
MS. SOMYING DEE
xxx-x-x5678-x
Amount 523.00 THB
Fee 0.00";
        let parsed = parse(text);
        assert_eq!(parsed.bank_id.as_deref(), Some("scb"));
        assert_eq!(parsed.amount_satang, Some(52_300));
        assert_eq!(parsed.occurred_date.as_deref(), Some("2026-11-21"));
        assert_eq!(parsed.receiver_name.as_deref(), Some("MS. SOMYING DEE"));
        assert_eq!(parsed.memo, None);
    }

    #[test]
    fn receiver_bank_below_header_does_not_override_sender_bank() {
        let text = "\
SCB
From
MR. SOMCHAI JAIDEE
To
MS. SOMYING DEE
ธนาคารกสิกรไทย
Amount 100.00 THB
21 Nov 2026 17:28";
        assert_eq!(parse(text).bank_id.as_deref(), Some("scb"));
    }

    #[test]
    fn bot_qr_bank_code_wins_over_text() {
        let qr = parse_slip_qr(BOT_SLIP_OK).expect("valid");
        assert_eq!(qr.sending_bank.as_deref(), Some("014"));
        let parsed = parse_slip_text("K PLUS\nAmount 1.00 THB", Some(&qr), &[], None);
        assert_eq!(parsed.bank_id.as_deref(), Some("scb"));
    }

    #[test]
    fn album_hint_is_used_only_for_non_shared_albums() {
        let plain = "Amount 10.00 THB";
        let parsed = parse_slip_text(plain, None, &[], Some("Pictures/K PLUS"));
        assert_eq!(parsed.bank_id.as_deref(), Some("kbank"));

        let shared = parse_slip_text(plain, None, &[], Some("Pictures/Krungthai"));
        assert_eq!(shared.bank_id, None);
    }

    // --- Thai slips --------------------------------------------------------

    const KBANK_TH: &str = "\
โอนเงินสำเร็จ
ธนาคารกสิกรไทย
21 พ.ย. 69 17:28
จาก
นาย สมชาย ใจดี
xxx-x-x1234-x
ไปยัง
นางสาว สมหญิง รักดี
xxx-x-x5678-x
จำนวนเงิน 523.00 บาท
ค่าธรรมเนียม 0.00 บาท
บันทึกช่วยจำ
ค่าข้าว";

    #[test]
    fn thai_kbank_slip_parses_all_fields() {
        let parsed = parse(KBANK_TH);
        assert_eq!(parsed.amount_satang, Some(52_300));
        assert_eq!(parsed.fee_satang, Some(0));
        assert_eq!(parsed.occurred_date.as_deref(), Some("2026-11-21"));
        assert_eq!(parsed.occurred_time.as_deref(), Some("17:28"));
        assert_eq!(parsed.sender_name.as_deref(), Some("นาย สมชาย ใจดี"));
        assert_eq!(parsed.receiver_name.as_deref(), Some("นางสาว สมหญิง รักดี"));
        assert_eq!(parsed.memo.as_deref(), Some("ค่าข้าว"));
        assert_eq!(parsed.bank_id.as_deref(), Some("kbank"));
        assert!(parsed.has_thai_script);
        assert!(!parsed.is_self_transfer);
        assert!(!parsed.needs_thai_ocr);
    }

    #[test]
    fn thai_inline_label_values_are_extracted() {
        let text = "จาก นาย สมชาย ใจดี\nไปยัง: นางสาว สมหญิง รักดี\nจำนวนเงิน 10.00 บาท";
        let parsed = parse(text);
        assert_eq!(parsed.sender_name.as_deref(), Some("นาย สมชาย ใจดี"));
        assert_eq!(parsed.receiver_name.as_deref(), Some("นางสาว สมหญิง รักดี"));
    }

    #[test]
    fn garbled_thai_text_routes_to_akson_ocr() {
        let mojibake = "à¸ªà¸§à¸±à¸ªà¸”à¸µ\nà¸ˆà¸³à¸™à¸§à¸™à¹€à¸‡à¸´à¸™\nà¸šà¸²à¸—";
        let parsed = parse(mojibake);
        assert!(parsed.needs_thai_ocr);
        assert!(parsed.confidence < 0.5);
    }

    #[test]
    fn sparse_text_routes_to_akson_ocr() {
        assert!(parse("K PLUS").needs_thai_ocr);
    }

    #[test]
    fn missing_receiver_routes_to_akson_ocr() {
        let text = "จาก นาย สมชาย ใจดี\n21 พ.ย. 69 17:28\nจำนวนเงิน 10.00 บาท\nxxx\nyyy";
        let parsed = parse(text);
        assert_eq!(parsed.receiver_name, None);
        assert!(parsed.needs_thai_ocr);
    }

    // --- Self-transfer -----------------------------------------------------

    #[test]
    fn self_transfer_when_receiver_matches_owner_name_thai() {
        let text = "จาก นาย สมชาย ใจดี\nไปยัง นาย สมชาย ใจดี\nจำนวนเงิน 10.00 บาท";
        let parsed = parse_slip_text(text, None, &owners(&["สมชาย ใจดี"]), None);
        assert!(parsed.is_self_transfer);
    }

    #[test]
    fn self_transfer_when_receiver_matches_owner_name_english() {
        let text = "From\nMR. SOMCHAI JAIDEE\nTo\nMS. SOMCHAI JAIDEE\nAmount 10.00 THB";
        let parsed = parse_slip_text(text, None, &owners(&["Somchai Jaidee"]), None);
        assert!(parsed.is_self_transfer);
    }

    #[test]
    fn self_transfer_by_high_sender_receiver_token_overlap() {
        let text = "From\nนาย สมชาย ใจดี\nTo\nนาย สมชาย\nAmount 10.00 THB";
        let parsed = parse_slip_text(text, None, &[], None);
        assert!(parsed.is_self_transfer);
    }

    #[test]
    fn not_self_transfer_for_different_people() {
        let text = "จาก นาย สมชาย ใจดี\nไปยัง นางสาว สมหญิง รักดี\nจำนวนเงิน 10.00 บาท";
        let parsed = parse_slip_text(text, None, &owners(&["สมชาย ใจดี"]), None);
        assert!(!parsed.is_self_transfer);
    }

    #[test]
    fn partial_first_name_match_is_not_self_transfer() {
        // Sharing only a first name, with different surnames, is not enough.
        let text = "From\nSomchai J\nTo\nSomchai K\nAmount 10.00 THB";
        let parsed = parse_slip_text(text, None, &[], None);
        assert!(!parsed.is_self_transfer);
    }

    // --- Trans ref from text -----------------------------------------------

    #[test]
    fn trans_ref_from_text_when_no_qr() {
        let text = "Ref. 202611211728ABC12\nAmount 10.00 THB";
        assert_eq!(parse(text).trans_ref.as_deref(), Some("202611211728ABC12"));
    }

    // --- AksonOCR response shapes (no network) -----------------------------

    #[test]
    fn akson_plain_text_body_is_returned_as_is() {
        assert_eq!(extract_ocr_text("  hello\n").unwrap(), "hello");
    }

    #[test]
    fn akson_json_shapes_are_accepted() {
        assert_eq!(extract_ocr_text(r#"{"text":"a"}"#).unwrap(), "a");
        assert_eq!(extract_ocr_text(r#"{"markdown":"b"}"#).unwrap(), "b");
        assert_eq!(
            extract_ocr_text(r#"{"pages":[{"markdown":"p1"},{"markdown":"p2"}]}"#).unwrap(),
            "p1\n\np2"
        );
        assert_eq!(extract_ocr_text(r#"{"data":{"text":"d"}}"#).unwrap(), "d");
    }

    #[test]
    fn akson_empty_or_unknown_shapes_are_errors() {
        assert!(extract_ocr_text("   ").is_err());
        assert!(extract_ocr_text(r#"{"text":"  "}"#).is_err());
        assert!(extract_ocr_text(r#"{"foo":1}"#).is_err());
    }

    // --- Real-world regression tests (synthetic/anonymized data) -----------

    #[test]
    fn kplus_labelless_self_transfer_with_abbreviated_surname() {
        let text = "\
Transfer Completed
Fee:
18 Nov 26 1:15 PM
MR. Somchai K
KBank
XXX-X-X1234-x
MR. SOMCHAI KONGDEE
KBank
XXX-X-X5678-X
Amount:
Transaction ID:
5,000.00 Baht
0.00 Baht
016322115826CTF01565
K+";
        let p = parse(text);
        assert_eq!(p.amount_satang, Some(500_000));
        assert_eq!(p.occurred_time.as_deref(), Some("13:15"));
        assert_eq!(p.sender_name.as_deref(), Some("MR. Somchai K"));
        assert_eq!(p.receiver_name.as_deref(), Some("MR. SOMCHAI KONGDEE"));
        assert_eq!(p.sender_acct_last4.as_deref(), Some("1234"));
        assert_eq!(p.receiver_acct_last4.as_deref(), Some("5678"));
        assert!(p.is_self_transfer);
        assert!(!p.is_non_slip);
    }

    #[test]
    fn dime_two_column_self_transfer_extracts_both_parties() {
        let text = "\
Transfer
40,774.06 THB
Fee 0.00 THB
From
To
Date
Slip ID
MR. Somchai Kongdee
E X-0420
MR. Somchai Kongdee
O x-5246
18 Nov 2026 -1:56 AM
632211284803
Scan to Verify
Oime!
Powered by KKP Bank";
        let p = parse(text);
        assert_eq!(p.amount_satang, Some(4_077_406));
        assert_eq!(p.occurred_time.as_deref(), Some("01:56"));
        assert_eq!(p.sender_name.as_deref(), Some("MR. Somchai Kongdee"));
        assert_eq!(p.receiver_name.as_deref(), Some("MR. Somchai Kongdee"));
        assert_eq!(p.sender_acct_last4.as_deref(), Some("0420"));
        assert_eq!(p.receiver_acct_last4.as_deref(), Some("5246"));
        assert!(p.is_self_transfer);
    }

    #[test]
    fn kplus_merchant_payment_extracts_merchant_and_is_not_transfer() {
        let text = "\
Payment Completed
Fee:
7 Nov 26 1:33 PM
MR. Somchai K
KBank
XXX-X-X1234-x
CENTRAL RESTAURANTS
GROUP CO.,LTD.
000002206355356
Amount:
Transaction ID:
523.00 Baht
0.00 Baht";
        let p = parse(text);
        assert_eq!(p.amount_satang, Some(52_300));
        assert_eq!(p.occurred_time.as_deref(), Some("13:33"));
        assert!(!p.is_self_transfer);
        assert!(p
            .receiver_name
            .as_deref()
            .is_some_and(|r| r.contains("CENTRAL RESTAURANTS")));
    }

    #[test]
    fn dime_fx_exchange_and_stock_order_are_flagged_as_non_slip() {
        let fx = "\
Status (As of 18 Nov 2026 - 11:55 AM)
• Complete
You have received the exchanged money.
Exchange from
297.00 USD
To
Payment Account: Dime! FCD - USD
10,044.54 THB
Receiving Account: Dime! Save
Exchange Rate";
        assert!(parse(fx).is_non_slip);

        let stock = "\
Status (As of 30 Oct 2026 - 06:19 PM)
• Open
Your buy order is waiting to be matched with sell orders in the market.
Buy AAPL
500.00 USD
Market Price
Stock Amount
Commission Fee";
        assert!(parse(stock).is_non_slip);
    }

    #[test]
    fn ocr_dot_thousands_and_mojibake_thai_slip_parses_amount_and_routes_to_akson() {
        let text = "\
Təutūuäiỗ
Krungthai
XXX-X-XX722-9
XXX XXX 5246
3.981.11 un
0.00 Un
18 w.a. 2569 - 13:14";
        let p = parse(text);
        assert_eq!(p.amount_satang, Some(398_111));
        assert_eq!(p.receiver_acct_last4.as_deref(), Some("5246"));
        assert!(p.needs_thai_ocr);
    }

    // --- "make by KBank" slips (#39) -----------------------------------------
    // ML Kit reads the grey receiver-bank icon as a short stray line ("UUD") that
    // sorts between the receiver name and the receiver's masked account.

    fn make_slip(receiver_lines: &str) -> String {
        format!(
            "PAYMENT COMPLETED\nmake\n22 Nov 2026 12:47\nSOMCHAI K\nxxx-x-x1234-x\n\
             {receiver_lines}\nxxx-x-xxxxxx5678-x\nAmount\n48.00 Baht\nFee\n0.00 Baht\n\
             Transaction ID: 0123456abcdeFGHij\nScan to verify"
        )
    }

    #[test]
    fn make_slip_icon_noise_is_not_the_receiver() {
        let p = parse(&make_slip("SKYTRAIN TVM\nUUD"));
        assert_eq!(p.receiver_name.as_deref(), Some("SKYTRAIN TVM"));
        assert_eq!(p.sender_name.as_deref(), Some("SOMCHAI K"));
        assert_eq!(p.receiver_acct_last4.as_deref(), Some("5678"));
    }

    #[test]
    fn make_slip_thai_receiver_is_not_replaced_by_icon_noise() {
        let p = parse(&make_slip("ร้านกาแฟ ดอยสวย-สาขาสุขุมวิท\nUUD"));
        assert_eq!(p.receiver_name.as_deref(), Some("ร้านกาแฟ ดอยสวย-สาขาสุขุมวิท"));
    }

    #[test]
    fn make_slip_two_line_receiver_name_is_joined() {
        let want = Some("SUNNY PLANET COMPANY LIMITED");
        let p = parse(&make_slip("SUNNY PLANET\nUUD\nCOMPANY LIMITED"));
        assert_eq!(p.receiver_name.as_deref(), want);
        let p = parse(&make_slip("UUD\nSUNNY PLANET\nCOMPANY LIMITED"));
        assert_eq!(p.receiver_name.as_deref(), want);
    }
}
