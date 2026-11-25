//! Local credit-card e-statement import.
//!
//! PDFs are decrypted and read on device. The password is used only for this
//! call and is never written to the database, logs, or the import report.
//! Parsers are fed text, so tests use synthetic statements only.

use std::collections::HashMap;

use chrono::{Local, NaiveDate};
use lopdf::{Document, LoadOptions};
use regex::Regex;
use rusqlite::{Connection, params};
use serde::Serialize;
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::categorizer::classify_local;
use crate::db::normalize_payee;

const MAX_PDF_BYTES: usize = 8 * 1024 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Issuer {
    KBank,
    Scb,
    Ktc,
    Krungsri,
    Bbl,
    Ttb,
    Uob,
    Aeon,
}

impl Issuer {
    fn as_str(self) -> &'static str {
        match self {
            Self::KBank => "kbank",
            Self::Scb => "scb",
            Self::Ktc => "ktc",
            Self::Krungsri => "krungsri",
            Self::Bbl => "bbl",
            Self::Ttb => "ttb",
            Self::Uob => "uob",
            Self::Aeon => "aeon",
        }
    }

    fn account_id(self) -> Option<&'static str> {
        match self {
            Self::KBank => Some("kbank"),
            Self::Scb => Some("scb"),
            Self::Ktc => Some("ktb"),
            Self::Krungsri => Some("bay"),
            Self::Bbl => Some("bbl"),
            Self::Ttb => Some("ttb"),
            Self::Uob => Some("uob"),
            Self::Aeon => None,
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::KBank => "KBank",
            Self::Scb => "SCB",
            Self::Ktc => "KTC",
            Self::Krungsri => "Krungsri",
            Self::Bbl => "BBL",
            Self::Ttb => "ttb",
            Self::Uob => "UOB",
            Self::Aeon => "AEON",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct StatementLine {
    local_date: String,
    payee: String,
    amount_satang: i64,
    credit: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportStatementReport {
    pub issuer: Option<String>,
    pub imported: usize,
    pub duplicates: usize,
    pub skipped: usize,
    pub needs_password: bool,
    pub wrong_password: bool,
    pub message: Option<String>,
}

impl ImportStatementReport {
    fn flags(needs_password: bool, wrong_password: bool, message: &str) -> Self {
        Self {
            issuer: None,
            imported: 0,
            duplicates: 0,
            skipped: 0,
            needs_password,
            wrong_password,
            message: Some(message.to_string()),
        }
    }
}

/// Map legacy Thai PDF CMaps that emit the UPC private-use block back to Thai.
///
/// U+F700.. lines up with U+0E01 (ก). A second block at U+E000 lines up with U+0E00.
pub fn repair_thai_pua(text: &str) -> String {
    text.chars()
        .map(|ch| {
            let code = ch as u32;
            if (0xF700..=0xF77E).contains(&code) {
                char::from_u32(code - 0xF700 + 0x0E01).unwrap_or(ch)
            } else if (0xE000..=0xE07F).contains(&code) {
                char::from_u32(code - 0xE000 + 0x0E00).unwrap_or(ch)
            } else {
                ch
            }
        })
        .collect()
}

pub fn detect_issuer(text: &str) -> Option<Issuer> {
    let header = text
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .take(12)
        .collect::<Vec<_>>()
        .join("\n")
        .to_lowercase();

    if header.contains("aeon") || header.contains("อิออน") {
        return Some(Issuer::Aeon);
    }
    if header.contains("krungthai card") || header.contains("ktc") {
        return Some(Issuer::Ktc);
    }
    if header.contains("first choice")
        || header.contains("krungsri")
        || header.contains("ayudhya")
        || header.contains("กรุงศรี")
    {
        return Some(Issuer::Krungsri);
    }
    if header.contains("cardx")
        || header.contains("siam commercial")
        || header.contains("ไทยพาณิชย์")
        || header.contains("scb credit")
        || header.contains("scb card")
    {
        return Some(Issuer::Scb);
    }
    if header.contains("kasikorn") || header.contains("kbank") || header.contains("กสิกร")
    {
        return Some(Issuer::KBank);
    }
    if header.contains("united overseas") || has_word(&header, "uob") {
        return Some(Issuer::Uob);
    }
    if header.contains("tmbthanachart") || header.contains("ทีทีบี") || has_word(&header, "ttb")
    {
        return Some(Issuer::Ttb);
    }
    if header.contains("bangkok bank")
        || header.contains("bualuang")
        || header.contains("ธนาคารกรุงเทพ")
    {
        return Some(Issuer::Bbl);
    }
    None
}

fn has_word(text: &str, word: &str) -> bool {
    text.split(|ch: char| !ch.is_ascii_alphanumeric())
        .any(|part| part == word)
}

fn parse_kbank(text: &str) -> Vec<StatementLine> {
    parse_dated_lines(text)
}

fn parse_scb(text: &str) -> Vec<StatementLine> {
    parse_dated_lines(text)
}

fn parse_ktc(text: &str) -> Vec<StatementLine> {
    parse_dated_lines(text)
}

fn parse_krungsri(text: &str) -> Vec<StatementLine> {
    parse_dated_lines(text)
}

fn parse_bbl(text: &str) -> Vec<StatementLine> {
    parse_dated_lines(text)
}

fn parse_ttb(text: &str) -> Vec<StatementLine> {
    parse_dated_lines(text)
}

fn parse_uob(text: &str) -> Vec<StatementLine> {
    parse_dated_lines(text)
}

fn parse_aeon(text: &str) -> Vec<StatementLine> {
    parse_dated_lines(text)
}

fn parse_for_issuer(issuer: Issuer, text: &str) -> Vec<StatementLine> {
    match issuer {
        Issuer::KBank => parse_kbank(text),
        Issuer::Scb => parse_scb(text),
        Issuer::Ktc => parse_ktc(text),
        Issuer::Krungsri => parse_krungsri(text),
        Issuer::Bbl => parse_bbl(text),
        Issuer::Ttb => parse_ttb(text),
        Issuer::Uob => parse_uob(text),
        Issuer::Aeon => parse_aeon(text),
    }
}

/// Split statement text into a header plus one row per transaction.
///
/// PDF text extraction often joins lines with spaces. A row starts at a date.
/// A second date counts as part of the same row only when a few spaces separate them,
/// which is how posting-date columns show up.
fn statement_rows(text: &str) -> Vec<String> {
    let date_re = Regex::new(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}").expect("date pattern");
    let dates: Vec<(usize, usize)> = date_re
        .find_iter(text)
        .map(|item| (item.start(), item.end()))
        .collect();
    if dates.is_empty() {
        return text
            .lines()
            .map(|line| line.trim().to_string())
            .filter(|line| !line.is_empty())
            .collect();
    }

    let mut rows = Vec::new();
    let header = text[..dates[0].0].trim();
    if !header.is_empty() {
        rows.extend(
            header
                .lines()
                .map(|line| line.trim().to_string())
                .filter(|line| !line.is_empty()),
        );
    }

    let mut index = 0;
    while index < dates.len() {
        let row_start = dates[index].0;
        if let Some(next) = dates.get(index + 1) {
            let gap = &text[dates[index].1..next.0];
            if gap.trim().is_empty() && gap.chars().count() <= 4 {
                index += 1;
            }
        }
        let stop = dates
            .get(index + 1)
            .map(|item| item.0)
            .unwrap_or(text.len());
        let row = text[row_start..stop].trim();
        if !row.is_empty() {
            rows.push(row.to_string());
        }
        index += 1;
    }
    rows
}

fn parse_dated_lines(text: &str) -> Vec<StatementLine> {
    let line_re = Regex::new(
        r"(?x)
        ^\s*
        (?P<d1>\d{1,2}[/-]\d{1,2}[/-]\d{2,4})
        (?:\s+(?P<d2>\d{1,2}[/-]\d{1,2}[/-]\d{2,4}))?
        \s+
        (?P<rest>.+?)
        \s*$
        ",
    )
    .expect("statement line pattern");
    let amount_re = Regex::new(
        r"(?xi)
        ^(?P<desc>.*\S)
        \s+
        (?P<amt>\(?\d{1,3}(?:,\d{3})*\.\d{2}\)?)
        (?:\s*(?P<flag>CR|DR|บาท|THB))?
        \s*$
        ",
    )
    .expect("statement amount pattern");

    let mut lines = Vec::new();
    for raw in statement_rows(text) {
        let raw = raw.trim();
        if raw.is_empty() {
            continue;
        }
        let Some(caps) = line_re.captures(raw) else {
            continue;
        };
        let Some(posted) = parse_statement_date(&caps["d1"]) else {
            continue;
        };
        let rest = caps.name("rest").map(|m| m.as_str()).unwrap_or("");
        let Some(amount_caps) = amount_re.captures(rest) else {
            continue;
        };
        let desc = amount_caps
            .name("desc")
            .map(|m| m.as_str().trim())
            .unwrap_or("");
        if desc.is_empty() || is_summary_row(desc) {
            continue;
        }
        let amt_raw = amount_caps.name("amt").map(|m| m.as_str()).unwrap_or("");
        let Some(amount_satang) = baht_to_satang(amt_raw) else {
            continue;
        };
        if amount_satang == 0 {
            continue;
        }
        let flag = amount_caps
            .name("flag")
            .map(|m| m.as_str().to_ascii_lowercase())
            .unwrap_or_default();
        let credit = flag == "cr" || amt_raw.contains('(') || looks_like_payment(desc);
        lines.push(StatementLine {
            local_date: posted.format("%Y-%m-%d").to_string(),
            payee: collapse_ws(desc),
            amount_satang,
            credit,
        });
    }
    lines
}

fn is_summary_row(desc: &str) -> bool {
    let lower = desc.to_lowercase();
    const SKIP: &[&str] = &[
        "total",
        "grand total",
        "previous balance",
        "new balance",
        "minimum payment",
        "credit limit",
        "ยอดรวม",
        "ยอดคงเหลือ",
        "วงเงิน",
    ];
    SKIP.iter()
        .any(|label| lower == *label || lower.starts_with(&format!("{label} ")))
}

fn looks_like_payment(desc: &str) -> bool {
    let lower = desc.to_lowercase();
    lower.starts_with("payment")
        || lower.starts_with("refund")
        || lower.starts_with("cashback")
        || lower.starts_with("ชำระ")
        || lower.starts_with("เงินคืน")
}

fn collapse_ws(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn parse_statement_date(raw: &str) -> Option<NaiveDate> {
    let parts: Vec<&str> = raw.split(|ch| ch == '/' || ch == '-').collect();
    if parts.len() != 3 {
        return None;
    }
    let day: u32 = parts[0].parse().ok()?;
    let month: u32 = parts[1].parse().ok()?;
    let year = crate::slip_parser::year_to_ce(parts[2].parse().ok()?, false);
    NaiveDate::from_ymd_opt(year, month, day)
}

fn baht_to_satang(raw: &str) -> Option<i64> {
    let mut whole = String::new();
    let mut frac = String::new();
    let mut saw_dot = false;
    for ch in raw.chars() {
        if ch.is_ascii_digit() {
            if saw_dot {
                if frac.len() < 2 {
                    frac.push(ch);
                }
            } else {
                whole.push(ch);
            }
        } else if ch == '.' && !saw_dot {
            saw_dot = true;
        }
    }
    if !saw_dot || frac.len() != 2 || whole.is_empty() {
        return None;
    }
    let baht: i64 = whole.parse().ok()?;
    let satang: i64 = frac.parse().ok()?;
    baht.checked_mul(100)?.checked_add(satang)
}

#[derive(Debug)]
enum PdfText {
    Ready(String),
    NeedsPassword,
    WrongPassword,
}

/// Decrypt when needed, then extract text. `password` is not retained.
fn extract_pdf_text(bytes: &[u8], password: Option<&str>) -> Result<PdfText, String> {
    if bytes.len() > MAX_PDF_BYTES {
        return Err("pdf is larger than 8 MB".to_string());
    }
    let password = password.map(str::trim).filter(|value| !value.is_empty());
    let doc = if let Some(password) = password {
        match Document::load_mem_with_options(bytes, LoadOptions::with_password(password)) {
            Ok(doc) => doc,
            Err(lopdf::Error::InvalidPassword) => return Ok(PdfText::WrongPassword),
            Err(error) => return Err(format!("could not read pdf: {error}")),
        }
    } else {
        match Document::load_mem(bytes) {
            Ok(doc) => doc,
            Err(lopdf::Error::InvalidPassword) => return Ok(PdfText::NeedsPassword),
            Err(error) => return Err(format!("could not read pdf: {error}")),
        }
    };

    if doc.is_encrypted() {
        return Ok(if password.is_some() {
            PdfText::WrongPassword
        } else {
            PdfText::NeedsPassword
        });
    }

    let mut page_numbers: Vec<u32> = doc.get_pages().keys().copied().collect();
    page_numbers.sort_unstable();
    if page_numbers.is_empty() {
        return Err("pdf has no pages".to_string());
    }
    let mut text = String::new();
    for page in page_numbers {
        match doc.extract_text(&[page]) {
            Ok(page_text) => {
                text.push_str(&page_text);
                text.push('\n');
            }
            Err(error) => return Err(format!("could not read pdf text: {error}")),
        }
    }
    Ok(PdfText::Ready(repair_thai_pua(&text)))
}

pub fn import_statement_pdf(
    conn: &Connection,
    pdf_bytes: &[u8],
    password: Option<&str>,
) -> Result<ImportStatementReport, String> {
    let text = match extract_pdf_text(pdf_bytes, password)? {
        PdfText::NeedsPassword => {
            return Ok(ImportStatementReport::flags(
                true,
                false,
                "This statement needs a password.",
            ));
        }
        PdfText::WrongPassword => {
            return Ok(ImportStatementReport::flags(
                false,
                true,
                "That password did not open the PDF.",
            ));
        }
        PdfText::Ready(text) => text,
    };
    import_statement_text(conn, &text)
}

pub fn import_statement_text(
    conn: &Connection,
    text: &str,
) -> Result<ImportStatementReport, String> {
    let text = repair_thai_pua(text);
    let Some(issuer) = detect_issuer(&text) else {
        return Ok(ImportStatementReport {
            issuer: None,
            imported: 0,
            duplicates: 0,
            skipped: 0,
            needs_password: false,
            wrong_password: false,
            message: Some("Unrecognized credit-card statement.".to_string()),
        });
    };

    let parsed = parse_for_issuer(issuer, &text);
    if parsed.is_empty() {
        return Ok(ImportStatementReport {
            issuer: Some(issuer.as_str().to_string()),
            imported: 0,
            duplicates: 0,
            skipped: 0,
            needs_password: false,
            wrong_password: false,
            message: Some("No statement lines found.".to_string()),
        });
    }

    let tx = conn
        .unchecked_transaction()
        .map_err(|error| format!("begin statement import: {error}"))?;
    let mut occurrence: HashMap<(String, i64, String), i64> = HashMap::new();
    let mut imported = 0usize;
    let mut duplicates = 0usize;
    let now = Local::now().to_rfc3339();

    for line in &parsed {
        let payee_norm = normalize_payee(&line.payee);
        let key = (
            line.local_date.clone(),
            line.amount_satang,
            payee_norm.clone(),
        );
        let seen = occurrence.entry(key).or_insert(0);
        *seen += 1;
        let nth = *seen;
        let fingerprint = line_fingerprint(issuer, line, nth);

        if fingerprint_exists(&tx, &fingerprint)?
            || matching_records(&tx, line, &payee_norm)? >= nth
        {
            duplicates += 1;
            continue;
        }

        let kind = if line.credit { "transfer" } else { "spending" };
        let category_id = if line.credit {
            None
        } else {
            classify_local(&tx, Some(&line.payee), None, None)
        };
        let parse_status = if kind == "spending" && category_id.is_none() {
            "needs_review"
        } else {
            "ok"
        };
        let reviewed = if parse_status == "ok" { 1 } else { 0 };
        let note = format!("{} · stmt:{fingerprint}", issuer.label());
        let id = Uuid::new_v4().to_string();

        tx.execute(
            "INSERT INTO records (
                id, kind, amount_satang, currency, local_date, local_time,
                account_id, category_id, payee_raw, payee_normalized, note,
                source, parse_status, is_reviewed, recurring_rule_id, created_at, updated_at
             ) VALUES (?1, ?2, ?3, 'THB', ?4, NULL, ?5, ?6, ?7, ?8, ?9, 'pdf_statement', ?10, ?11, NULL, ?12, ?12)",
            params![
                id,
                kind,
                line.amount_satang,
                line.local_date,
                issuer.account_id(),
                category_id,
                line.payee,
                payee_norm,
                note,
                parse_status,
                reviewed,
                now
            ],
        )
        .map_err(|error| format!("insert statement line: {error}"))?;
        imported += 1;
    }

    tx.commit()
        .map_err(|error| format!("commit statement import: {error}"))?;

    Ok(ImportStatementReport {
        issuer: Some(issuer.as_str().to_string()),
        imported,
        duplicates,
        skipped: 0,
        needs_password: false,
        wrong_password: false,
        message: None,
    })
}

fn line_fingerprint(issuer: Issuer, line: &StatementLine, nth: i64) -> String {
    let mut hasher = Sha256::new();
    hasher.update(issuer.as_str().as_bytes());
    hasher.update(b"|");
    hasher.update(line.local_date.as_bytes());
    hasher.update(b"|");
    hasher.update(line.amount_satang.to_string().as_bytes());
    hasher.update(b"|");
    hasher.update(normalize_payee(&line.payee).as_bytes());
    hasher.update(b"|");
    hasher.update(nth.to_string().as_bytes());
    hex::encode(hasher.finalize())[..16].to_string()
}

fn fingerprint_exists(conn: &Connection, fingerprint: &str) -> Result<bool, String> {
    let needle = format!("stmt:{fingerprint}");
    conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM records WHERE instr(ifnull(note, ''), ?1) > 0)",
        params![needle],
        |row| row.get(0),
    )
    .map_err(|error| format!("check statement fingerprint: {error}"))
}

fn matching_records(
    conn: &Connection,
    line: &StatementLine,
    payee_norm: &str,
) -> Result<i64, String> {
    conn.query_row(
        "SELECT COUNT(*) FROM records
         WHERE local_date = ?1 AND amount_satang = ?2 AND payee_normalized = ?3",
        params![line.local_date, line.amount_satang, payee_norm],
        |row| row.get(0),
    )
    .map_err(|error| format!("count matching records: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::init_db;
    use lopdf::{
        Document, EncryptionState, EncryptionVersion, Object, Permissions, Stream, dictionary,
    };

    fn temp_db() -> (Connection, std::path::PathBuf) {
        let path = std::env::temp_dir().join(format!("moojot-stmt-{}.sqlite3", Uuid::new_v4()));
        let conn = init_db(&path).expect("init db");
        (conn, path)
    }

    fn cleanup(path: &std::path::Path) {
        let _ = std::fs::remove_file(path);
        let _ = std::fs::remove_file(path.with_extension("sqlite3-wal"));
        let mut wal = path.to_path_buf();
        wal.set_extension("sqlite3-wal");
        let _ = std::fs::remove_file(wal);
        let mut shm = path.as_os_str().to_os_string();
        shm.push("-shm");
        let _ = std::fs::remove_file(shm);
    }

    #[test]
    fn repairs_upc_private_use_to_thai() {
        let pua: String = "กสิกร"
            .chars()
            .map(|ch| char::from_u32((ch as u32) - 0x0E01 + 0xF700).unwrap())
            .collect();
        assert_ne!(pua, "กสิกร");
        assert_eq!(repair_thai_pua(&pua), "กสิกร");

        let legacy: String = "ไทย"
            .chars()
            .map(|ch| char::from_u32((ch as u32) - 0x0E00 + 0xE000).unwrap())
            .collect();
        assert_eq!(repair_thai_pua(&legacy), "ไทย");
        assert_eq!(repair_thai_pua("7-ELEVEN"), "7-ELEVEN");
    }

    #[test]
    fn two_digit_be_year_in_a_statement_is_not_read_as_2069() {
        assert_eq!(
            parse_statement_date("15/10/69"),
            NaiveDate::from_ymd_opt(2026, 10, 15)
        );
        assert_eq!(
            parse_statement_date("15/10/26"),
            NaiveDate::from_ymd_opt(2026, 10, 15)
        );
        assert_eq!(
            parse_statement_date("02/11/2569"),
            NaiveDate::from_ymd_opt(2026, 11, 2)
        );
    }

    #[test]
    fn detects_each_issuer_from_its_header() {
        let samples = [
            ("KASIKORNBANK\nCREDIT CARD STATEMENT\n", Issuer::KBank),
            ("Siam Commercial Bank\nCardX STATEMENT\n", Issuer::Scb),
            ("Krungthai Card\nKTC CREDIT CARD\n", Issuer::Ktc),
            ("Bank of Ayudhya\nKRUNGSRI FIRST CHOICE\n", Issuer::Krungsri),
            ("Bangkok Bank\nCREDIT CARD STATEMENT\n", Issuer::Bbl),
            ("TMBThanachart\nttb CREDIT CARD\n", Issuer::Ttb),
            ("United Overseas Bank\nUOB CREDIT CARD\n", Issuer::Uob),
            ("AEON THAILAND\nCREDIT CARD STATEMENT\n", Issuer::Aeon),
        ];
        for (text, issuer) in samples {
            assert_eq!(detect_issuer(text), Some(issuer), "{text}");
        }
    }

    #[test]
    fn parses_each_issuer_fixture_without_real_statements() {
        let kbank = "\
KASIKORNBANK
CREDIT CARD STATEMENT
15/10/2026 7-ELEVEN BANGKOK 89.00
16/10/2026 GRABFOOD 250.50
20/10/2026 PAYMENT THANK YOU 300.00 CR
";
        let lines = parse_kbank(kbank);
        assert_eq!(lines.len(), 3);
        assert_eq!(lines[0].amount_satang, 8900);
        assert!(!lines[0].credit);
        assert_eq!(lines[1].amount_satang, 25050);
        assert!(lines[2].credit);
        assert_eq!(lines[2].local_date, "2026-10-20");

        let scb = "\
Siam Commercial Bank
CardX STATEMENT
15/10/2026 16/10/2026 NETFLIX 419.00
18/10/2026 18/10/2026 7-ELEVEN 45.00
";
        let scb_lines = parse_scb(scb);
        assert_eq!(scb_lines.len(), 2);
        assert_eq!(scb_lines[0].payee, "NETFLIX");
        assert_eq!(scb_lines[0].local_date, "2026-10-15");
        assert_eq!(scb_lines[0].amount_satang, 41900);

        let ktc = "\
Krungthai Card
KTC CREDIT CARD
15/10/26 SPOTIFY 129.00
";
        assert_eq!(parse_ktc(ktc)[0].local_date, "2026-10-15");
        assert_eq!(parse_ktc(ktc)[0].amount_satang, 12900);

        let krungsri = "\
Bank of Ayudhya
KRUNGSRI FIRST CHOICE
15/10/2026 BIG C 1,500.00
";
        assert_eq!(parse_krungsri(krungsri)[0].amount_satang, 150_000);

        let bbl = "\
Bangkok Bank
CREDIT CARD STATEMENT
15/10/2026 MAJOR CINEPLEX 280.00
";
        assert_eq!(parse_bbl(bbl)[0].payee, "MAJOR CINEPLEX");

        let ttb = "\
TMBThanachart
ttb CREDIT CARD
15/10/2026 PTT STATION 1,500.50
";
        assert_eq!(parse_ttb(ttb)[0].amount_satang, 150_050);

        let uob = "\
United Overseas Bank
UOB CREDIT CARD
15/10/2026 LAZADA 999.00
";
        assert_eq!(parse_uob(uob)[0].payee, "LAZADA");

        let aeon = "\
AEON THAILAND
CREDIT CARD STATEMENT
15/10/2026 SHOPEE 150.00
02/11/2569 ชำระเงิน (80.00)
";
        let aeon_lines = parse_aeon(aeon);
        assert_eq!(aeon_lines.len(), 2);
        assert_eq!(aeon_lines[0].payee, "SHOPEE");
        assert!(aeon_lines[1].credit);
        assert_eq!(aeon_lines[1].local_date, "2026-11-02");
        assert_eq!(aeon_lines[1].amount_satang, 8000);
    }

    #[test]
    fn import_categorizes_dedups_and_keeps_password_out_of_rows() {
        let (conn, path) = temp_db();
        let text = "\
KASIKORNBANK
CREDIT CARD STATEMENT
15/10/2026 7-ELEVEN BANGKOK 89.00
16/10/2026 UNKNOWN MERCHANT 12.00
20/10/2026 PAYMENT THANK YOU 300.00 CR
";
        let first = import_statement_text(&conn, text).unwrap();
        assert_eq!(first.issuer.as_deref(), Some("kbank"));
        assert_eq!(first.imported, 3);
        assert_eq!(first.duplicates, 0);
        assert!(first.message.is_none());

        let food: String = conn
            .query_row(
                "SELECT category_id FROM records WHERE payee_raw LIKE '7-ELEVEN%'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(food, "cat_food");

        let review: String = conn
            .query_row(
                "SELECT parse_status FROM records WHERE payee_raw = 'UNKNOWN MERCHANT'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(review, "needs_review");

        let kind: String = conn
            .query_row(
                "SELECT kind FROM records WHERE payee_raw = 'PAYMENT THANK YOU'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(kind, "transfer");

        let source: String = conn
            .query_row("SELECT source FROM records LIMIT 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(source, "pdf_statement");

        let notes: String = conn
            .query_row(
                "SELECT group_concat(ifnull(note, ''), '\n') FROM records",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(!notes.to_lowercase().contains("password"));

        let second = import_statement_text(&conn, text).unwrap();
        assert_eq!(second.imported, 0);
        assert_eq!(second.duplicates, 3);

        conn.execute(
            "INSERT INTO records (
                id, kind, amount_satang, currency, local_date, local_time,
                account_id, category_id, payee_raw, payee_normalized, note,
                source, parse_status, is_reviewed, created_at, updated_at
             ) VALUES ('slip-1', 'spending', 4500, 'THB', '2026-10-21', NULL,
                'kbank', 'cat_food', '7-ELEVEN', '7-eleven', NULL,
                'slip_auto', 'ok', 1, '2026-10-21T00:00:00+07:00', '2026-10-21T00:00:00+07:00')",
            [],
        )
        .unwrap();
        let with_slip = "\
KASIKORNBANK
CREDIT CARD STATEMENT
21/10/2026 7-ELEVEN 45.00
21/10/2026 7-ELEVEN 45.00
";
        let third = import_statement_text(&conn, with_slip).unwrap();
        assert_eq!(third.duplicates, 1);
        assert_eq!(third.imported, 1);

        drop(conn);
        cleanup(&path);
    }

    fn pdf_with_lines(lines: &[&str]) -> Document {
        let mut doc = Document::with_version("1.5");
        doc.trailer.set(
            "ID",
            Object::Array(vec![
                Object::string_literal(b"0123456789abcdef".to_vec()),
                Object::string_literal(b"fedcba9876543210".to_vec()),
            ]),
        );
        let pages_id = doc.new_object_id();
        let font_id = doc.add_object(dictionary! {
            "Type" => "Font",
            "Subtype" => "Type1",
            "BaseFont" => "Helvetica",
        });
        let mut content = String::from("BT\n/F1 12 Tf\n50 780 Td\n");
        for (index, line) in lines.iter().enumerate() {
            if index > 0 {
                content.push_str("0 -16 Td\n");
            }
            let escaped = line
                .replace('\\', "\\\\")
                .replace('(', "\\(")
                .replace(')', "\\)");
            content.push_str(&format!("({escaped}) Tj\n"));
        }
        content.push_str("ET\n");
        let contents_id = doc.add_object(Stream::new(dictionary! {}, content.into_bytes()));
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "MediaBox" => vec![0.into(), 0.into(), 612.into(), 792.into()],
            "Resources" => dictionary! {
                "Font" => dictionary! {
                    "F1" => font_id,
                },
            },
            "Contents" => contents_id,
        });
        doc.objects.insert(
            pages_id,
            Object::Dictionary(dictionary! {
                "Type" => "Pages",
                "Kids" => vec![Object::Reference(page_id)],
                "Count" => 1,
            }),
        );
        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        });
        doc.trailer.set("Root", catalog_id);
        doc
    }

    fn save_pdf(doc: &mut Document) -> Vec<u8> {
        let mut bytes = Vec::new();
        doc.save_to(&mut bytes).unwrap();
        bytes
    }

    #[test]
    fn decrypts_a_synthetic_statement_and_rejects_a_bad_password() {
        let mut doc = pdf_with_lines(&[
            "KASIKORNBANK",
            "CREDIT CARD STATEMENT",
            "15/10/2026 7-ELEVEN 89.00",
        ]);
        let state = EncryptionState::try_from(EncryptionVersion::V2 {
            document: &doc,
            owner_password: "owner-pass",
            user_password: "01012500",
            key_length: 128,
            permissions: Permissions::all(),
        })
        .unwrap();
        doc.encrypt(&state).unwrap();
        let bytes = save_pdf(&mut doc);

        let locked = extract_pdf_text(&bytes, None).unwrap();
        assert!(matches!(locked, PdfText::NeedsPassword));

        let wrong = extract_pdf_text(&bytes, Some("nope")).unwrap();
        assert!(matches!(wrong, PdfText::WrongPassword));

        let opened = extract_pdf_text(&bytes, Some("01012500")).unwrap();
        match opened {
            PdfText::Ready(text) => {
                assert!(text.contains("7-ELEVEN"));
                assert!(text.contains("KASIKORNBANK"));
                assert!(!text.contains("01012500"));
            }
            other => panic!("expected decrypted text, got {other:?}"),
        }

        let (conn, path) = temp_db();
        let report = import_statement_pdf(&conn, &bytes, Some("01012500")).unwrap();
        assert_eq!(report.imported, 1);
        assert!(!report.needs_password);
        assert!(!report.wrong_password);
        let stored_note: String = conn
            .query_row("SELECT note FROM records", [], |row| row.get(0))
            .unwrap();
        assert!(!stored_note.contains("01012500"));
        drop(conn);
        cleanup(&path);
    }
}
