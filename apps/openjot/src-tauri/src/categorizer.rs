//! Free, local-first Thai + English auto-categorizer.
//!
//! Matching happens in two priorities, both fully offline:
//!
//! 1. **User & learned rules** in `payee_rules`. An exact normalized match wins, then
//!    substring matches ordered by `hit_count DESC, length(pattern) DESC`. Fields are
//!    tested in the order payee, then note.
//! 2. **Built-in merchant & Thai keyword dictionary** (`builtin_merchant_rules`), longest
//!    pattern first, so `grabfood` beats `grab` and `kbank plustinum` beats `kbank`.
//!    Fields are tested in the order payee, note, then a safe subset of OCR text.
//!
//! Text is normalized (whitespace collapsed, lowercased). Short ASCII patterns (5 chars or
//! fewer) must match whole words, so `pea` does not hit `peanut` and `tops` does not hit
//! `laptops`. Thai patterns and longer patterns match as plain substrings.

use std::sync::OnceLock;

use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Rows whose id starts with this prefix were seeded by `db.rs` and are flagged built-in.
const SEED_ID_PREFIX: &str = "seed_";
/// OCR text is noisy, so only longer brand, biller and card names are consulted there.
const OCR_MIN_CHARS: usize = 6;
/// ASCII patterns up to this length must match whole words.
const SHORT_ASCII_MAX: usize = 5;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PayeeRule {
    pub id: String,
    pub pattern: String,
    pub category_id: String,
    pub hit_count: i32,
    pub is_builtin: bool,
}

/// Curated built-in dictionary: `(pattern, category_id)`. Patterns are lowercase with single
/// spaces, which the tests enforce. Spending categories only.
const BUILTIN_RULES: &[(&str, &str)] = &[
    // ---- Food: chains, delivery and Thai food stems ----
    ("7-eleven", "cat_food"),
    ("7eleven", "cat_food"),
    ("เซเว่น", "cat_food"),
    ("cp all", "cat_food"),
    ("cpall", "cat_food"),
    ("starbucks", "cat_food"),
    ("สตาร์บัค", "cat_food"),
    ("cafe amazon", "cat_food"),
    ("inthanin", "cat_food"),
    ("punthai", "cat_food"),
    ("chatramue", "cat_food"),
    ("swensen", "cat_food"),
    ("สเวนเซ่น", "cat_food"),
    ("mk restaurant", "cat_food"),
    ("bar b q plaza", "cat_food"),
    ("barbq plaza", "cat_food"),
    ("central restaurants", "cat_food"),
    ("minor food", "cat_food"),
    ("kfc", "cat_food"),
    ("เคเอฟซี", "cat_food"),
    ("mcdonald", "cat_food"),
    ("แมคโดนัลด์", "cat_food"),
    ("burger king", "cat_food"),
    ("เบอร์เกอร์ คิง", "cat_food"),
    ("sushiro", "cat_food"),
    ("suki tee noi", "cat_food"),
    ("sukiteenoi", "cat_food"),
    ("after you", "cat_food"),
    ("grabfood", "cat_food"),
    ("grab food", "cat_food"),
    ("lineman", "cat_food"),
    ("line man", "cat_food"),
    ("ไลน์แมน", "cat_food"),
    ("foodpanda", "cat_food"),
    ("food panda", "cat_food"),
    ("ฟู้ดแพนด้า", "cat_food"),
    ("robinhood", "cat_food"),
    ("shopeefood", "cat_food"),
    ("shopee food", "cat_food"),
    ("bolt food", "cat_food"),
    ("ร้านอาหาร", "cat_food"),
    ("ก๋วยเตี๋ยว", "cat_food"),
    ("ข้าวมันไก่", "cat_food"),
    ("ข้าวแกง", "cat_food"),
    ("ส้มตำ", "cat_food"),
    ("หมูกระทะ", "cat_food"),
    ("ชาบู", "cat_food"),
    ("กาแฟ", "cat_food"),
    ("คาเฟ่", "cat_food"),
    ("เบเกอรี่", "cat_food"),
    ("ชานม", "cat_food"),
    ("cafe", "cat_food"),
    // ---- Transit & fuel ----
    ("bangkok smartcard", "cat_transport"),
    ("rabbit", "cat_transport"),
    ("bts", "cat_transport"),
    ("บีทีเอส", "cat_transport"),
    ("mrt", "cat_transport"),
    ("bem", "cat_transport"),
    ("รถไฟฟ้า", "cat_transport"),
    ("expressway", "cat_transport"),
    ("exat", "cat_transport"),
    ("easy pass", "cat_transport"),
    ("m-flow", "cat_transport"),
    ("ค่าทางด่วน", "cat_transport"),
    ("ค่าจอดรถ", "cat_transport"),
    ("ค่าเช่ารถ", "cat_transport"),
    ("แท็กซี่", "cat_transport"),
    ("ptt", "cat_transport"),
    ("ปตท", "cat_transport"),
    ("bangchak", "cat_transport"),
    ("บางจาก", "cat_transport"),
    ("shell", "cat_transport"),
    ("caltex", "cat_transport"),
    ("esso", "cat_transport"),
    ("susco", "cat_transport"),
    ("pt max", "cat_transport"),
    ("ปั๊มน้ำมัน", "cat_transport"),
    ("ค่าน้ำมัน", "cat_transport"),
    ("grab", "cat_transport"),
    ("แกร็บ", "cat_transport"),
    ("bolt", "cat_transport"),
    ("muvmi", "cat_transport"),
    ("airasia", "cat_transport"),
    ("nok air", "cat_transport"),
    ("thai airways", "cat_transport"),
    ("thai vietjet", "cat_transport"),
    // ---- Supermarkets & necessities ----
    ("lotus", "cat_necessities"),
    ("โลตัส", "cat_necessities"),
    ("tesco lotus", "cat_necessities"),
    ("big c", "cat_necessities"),
    ("บิ๊กซี", "cat_necessities"),
    ("makro", "cat_necessities"),
    ("tops", "cat_necessities"),
    ("villa market", "cat_necessities"),
    ("gourmet market", "cat_necessities"),
    ("foodland", "cat_necessities"),
    ("cj more", "cat_necessities"),
    ("lawson", "cat_necessities"),
    ("familymart", "cat_necessities"),
    ("แฟมิลี่มาร์ท", "cat_necessities"),
    ("maxvalu", "cat_necessities"),
    ("boots", "cat_necessities"),
    ("watsons", "cat_necessities"),
    ("วัตสัน", "cat_necessities"),
    ("eveandboy", "cat_necessities"),
    // ---- Shopping ----
    ("shopee", "cat_shopping"),
    ("ช้อปปี้", "cat_shopping"),
    ("lazada", "cat_shopping"),
    ("ลาซาด้า", "cat_shopping"),
    ("tiktok shop", "cat_shopping"),
    ("central dept", "cat_shopping"),
    ("robinson", "cat_shopping"),
    ("โรบินสัน", "cat_shopping"),
    ("the mall", "cat_shopping"),
    ("uniqlo", "cat_shopping"),
    ("zara", "cat_shopping"),
    ("h&m", "cat_shopping"),
    ("decathlon", "cat_shopping"),
    ("ikea", "cat_shopping"),
    ("homepro", "cat_shopping"),
    ("โฮมโปร", "cat_shopping"),
    ("thai watsadu", "cat_shopping"),
    ("power buy", "cat_shopping"),
    ("banana it", "cat_shopping"),
    ("advice", "cat_shopping"),
    ("jib", "cat_shopping"),
    ("apple store", "cat_shopping"),
    // ---- Entertainment & subscriptions ----
    ("netflix", "cat_entertainment"),
    ("spotify", "cat_entertainment"),
    ("youtube", "cat_entertainment"),
    ("yt premium", "cat_entertainment"),
    ("disney+", "cat_entertainment"),
    ("hbo", "cat_entertainment"),
    ("viu", "cat_entertainment"),
    ("major cineplex", "cat_entertainment"),
    ("เมเจอร์ซีนีเพล็กซ์", "cat_entertainment"),
    ("sf cinema", "cat_entertainment"),
    ("steam", "cat_entertainment"),
    ("playstation", "cat_entertainment"),
    ("nintendo", "cat_entertainment"),
    ("apple.com/bill", "cat_entertainment"),
    ("google play", "cat_entertainment"),
    // ---- Home, utilities & telecom ----
    ("การไฟฟ้านครหลวง", "cat_home"),
    ("การไฟฟ้าส่วนภูมิภาค", "cat_home"),
    ("การประปานครหลวง", "cat_home"),
    ("การประปาส่วนภูมิภาค", "cat_home"),
    ("mea", "cat_home"),
    ("pea", "cat_home"),
    ("mwa", "cat_home"),
    ("pwa", "cat_home"),
    ("ais", "cat_home"),
    ("เอไอเอส", "cat_home"),
    ("true", "cat_home"),
    ("dtac", "cat_home"),
    ("ดีแทค", "cat_home"),
    ("3bb", "cat_home"),
    ("nt broadband", "cat_home"),
    ("condo", "cat_home"),
    ("juristic", "cat_home"),
    ("นิติบุคคล", "cat_home"),
    ("ค่าส่วนกลาง", "cat_home"),
    ("ค่าไฟ", "cat_home"),
    ("ค่าน้ำ", "cat_home"),
    ("ค่าเน็ต", "cat_home"),
    ("ค่าเช่า", "cat_home"),
    // ---- Health ----
    ("bangkok hospital", "cat_health"),
    ("bumrungrad", "cat_health"),
    ("บำรุงราษฎร์", "cat_health"),
    ("samitivej", "cat_health"),
    ("สมิติเวช", "cat_health"),
    ("phyathai", "cat_health"),
    ("โรงพยาบาลพญาไท", "cat_health"),
    ("paolo", "cat_health"),
    ("ramkhamhaeng hospital", "cat_health"),
    ("siriraj", "cat_health"),
    ("ศิริราช", "cat_health"),
    ("chulalongkorn hospital", "cat_health"),
    ("fascino", "cat_health"),
    ("pharmacy", "cat_health"),
    ("ร้านขายยา", "cat_health"),
    ("ร้านยา", "cat_health"),
    ("clinic", "cat_health"),
    ("คลินิก", "cat_health"),
    ("hospital", "cat_health"),
    ("โรงพยาบาล", "cat_health"),
    ("ค่าหมอ", "cat_health"),
    // ---- Credit cards & loans ----
    ("kbank plustinum", "cat_loans"),
    ("kbank platinum", "cat_loans"),
    ("ktc", "cat_loans"),
    ("krungthai card", "cat_loans"),
    ("cardx", "cat_loans"),
    ("krungsri card", "cat_loans"),
    ("first choice", "cat_loans"),
    ("central the1", "cat_loans"),
    ("aeon credit", "cat_loans"),
    ("aeon card", "cat_loans"),
    ("uob card", "cat_loans"),
    ("ttb card", "cat_loans"),
    ("citi", "cat_loans"),
    ("spaylater", "cat_loans"),
    ("บัตรเครดิต", "cat_loans"),
    ("สินเชื่อ", "cat_loans"),
    ("ค่างวด", "cat_loans"),
    // ---- Work, cloud & dev SaaS ----
    ("cloudflare", "cat_work"),
    ("cloudfare", "cat_work"),
    ("openai", "cat_work"),
    ("chatgpt", "cat_work"),
    ("claude", "cat_work"),
    ("anthropic", "cat_work"),
    ("github", "cat_work"),
    ("vercel", "cat_work"),
    ("aws", "cat_work"),
    ("amazon web services", "cat_work"),
    ("google cloud", "cat_work"),
    ("digitalocean", "cat_work"),
    ("opencode", "cat_work"),
    ("cursor", "cat_work"),
    ("domain", "cat_work"),
    ("namecheap", "cat_work"),
    ("godaddy", "cat_work"),
    ("fastwork", "cat_work"),
    // ---- Investments ----
    ("dime", "cat_invest"),
    ("innovestx", "cat_invest"),
    ("finnomena", "cat_invest"),
    ("bitkub", "cat_invest"),
    ("binance", "cat_invest"),
    ("k-asset", "cat_invest"),
    ("k asset", "cat_invest"),
    ("scb asset", "cat_invest"),
    ("set index", "cat_invest"),
    ("ตลาดหลักทรัพย์", "cat_invest"),
    ("กองทุน", "cat_invest"),
    // ---- Giving ----
    ("ทำบุญ", "cat_giving"),
    ("บริจาค", "cat_giving"),
    ("วัด", "cat_giving"),
    ("มูลนิธิ", "cat_giving"),
    ("donation", "cat_giving"),
    // ---- Education ----
    ("ค่าเทอม", "cat_education"),
    ("ค่าเรียน", "cat_education"),
    ("หนังสือ", "cat_education"),
    ("se-ed", "cat_education"),
    ("มหาวิทยาลัย", "cat_education"),
    // ---- Travel ----
    ("โรงแรม", "cat_travel"),
    ("ที่พัก", "cat_travel"),
    ("agoda", "cat_travel"),
    ("booking.com", "cat_travel"),
    ("traveloka", "cat_travel"),
];

/// Built-in merchant and Thai keyword dictionary, `(pattern, category_id)`.
pub fn builtin_merchant_rules() -> &'static [(&'static str, &'static str)] {
    BUILTIN_RULES
}

/// Built-in rules sorted longest pattern first (stable, so list order breaks ties).
fn builtins_longest_first() -> &'static [(&'static str, &'static str)] {
    static SORTED: OnceLock<Vec<(&'static str, &'static str)>> = OnceLock::new();
    SORTED.get_or_init(|| {
        let mut sorted = BUILTIN_RULES.to_vec();
        sorted.sort_by_key(|(pattern, _)| std::cmp::Reverse(pattern.chars().count()));
        sorted
    })
}

/// Collapses whitespace and lowercases, so matching ignores case and spacing differences.
fn normalize(raw: &str) -> String {
    raw.split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

/// Matches a normalized pattern inside normalized text. Short ASCII patterns must sit on
/// word boundaries; everything else is a plain substring match.
fn contains_pattern(haystack: &str, pattern: &str) -> bool {
    if pattern.is_empty() || pattern.len() > haystack.len() {
        return false;
    }
    let short_ascii = pattern.is_ascii() && pattern.len() <= SHORT_ASCII_MAX;
    if !short_ascii {
        return haystack.contains(pattern);
    }
    haystack.match_indices(pattern).any(|(start, _)| {
        let end = start + pattern.len();
        let before_ok = haystack[..start]
            .chars()
            .next_back()
            .is_none_or(|c| !c.is_ascii_alphanumeric());
        let after_ok = haystack[end..]
            .chars()
            .next()
            .is_none_or(|c| !c.is_ascii_alphanumeric());
        before_ok && after_ok
    })
}

/// Returns the category of the longest built-in pattern found in `text`, considering only
/// patterns of at least `min_chars` characters.
fn longest_builtin_category(text: &str, min_chars: usize) -> Option<&'static str> {
    if text.is_empty() {
        return None;
    }
    builtins_longest_first()
        .iter()
        .filter(|(pattern, _)| pattern.chars().count() >= min_chars)
        .find(|(pattern, _)| contains_pattern(text, pattern))
        .map(|(_, category)| *category)
}

/// Loads `payee_rules` that point at a spending category, in priority order:
/// `hit_count DESC, length(pattern) DESC`. Rules learned from income records are skipped,
/// because `classify_local` only categorizes spending.
fn load_ordered_rules(conn: &Connection) -> rusqlite::Result<Vec<(String, String)>> {
    let mut stmt = conn.prepare(
        "SELECT pattern, category_id FROM payee_rules
         WHERE category_id IN (SELECT id FROM categories WHERE kind = 'spending')
         ORDER BY hit_count DESC, length(pattern) DESC, pattern",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok((normalize(&r.get::<_, String>(0)?), r.get::<_, String>(1)?))
    })?;
    let rules: Vec<(String, String)> = rows.collect::<rusqlite::Result<_>>()?;
    Ok(rules)
}

/// Priority 1: user and learned rules. Exact matches come first (payee, then note), then
/// substring matches tested against payee, then note, in rule priority order.
fn match_user_rules(
    rules: &[(String, String)],
    payee: Option<&str>,
    note: Option<&str>,
) -> Option<String> {
    let texts: Vec<&str> = [payee, note].into_iter().flatten().collect();

    for text in &texts {
        if let Some((_, category)) = rules.iter().find(|(p, _)| p.as_str() == *text) {
            return Some(category.clone());
        }
    }
    for text in &texts {
        if let Some((_, category)) = rules
            .iter()
            .find(|(p, _)| contains_pattern(text, p.as_str()))
        {
            return Some(category.clone());
        }
    }
    None
}

/// Classifies a spending record without network access.
///
/// Priority 1 checks user and learned rules in `payee_rules`. Priority 2 checks the built-in
/// dictionary against payee, then note, then OCR text. Within each priority, the first
/// field that matches wins. Returns `None` when nothing matches.
pub fn classify_local(
    conn: &Connection,
    payee_raw: Option<&str>,
    note: Option<&str>,
    ocr_text: Option<&str>,
) -> Option<String> {
    let payee = payee_raw.map(normalize).filter(|s| !s.is_empty());
    let note = note.map(normalize).filter(|s| !s.is_empty());
    let ocr = ocr_text.map(normalize).filter(|s| !s.is_empty());

    // Priority 1: user-learned and custom rules. A failed read counts as no rules.
    let rules = load_ordered_rules(conn).unwrap_or_default();
    if let Some(category) = match_user_rules(&rules, payee.as_deref(), note.as_deref()) {
        return Some(category);
    }

    // Priority 2: built-in dictionary, payee then note.
    for text in [payee.as_deref(), note.as_deref()].into_iter().flatten() {
        if let Some(category) = longest_builtin_category(text, 0) {
            return Some(category.to_string());
        }
    }

    // OCR fallback: only longer brand, biller and card names.
    if let Some(category) = ocr
        .as_deref()
        .and_then(|text| longest_builtin_category(text, OCR_MIN_CHARS))
    {
        return Some(category.to_string());
    }

    None
}

fn rule_from_row(r: &rusqlite::Row<'_>) -> rusqlite::Result<PayeeRule> {
    let id: String = r.get(0)?;
    let is_builtin = id.starts_with(SEED_ID_PREFIX);
    Ok(PayeeRule {
        id,
        pattern: r.get(1)?,
        category_id: r.get(2)?,
        hit_count: r.get(3)?,
        is_builtin,
    })
}

/// Lists every `payee_rules` row, most-used first. Rows seeded by `db.rs` have
/// `is_builtin = true`.
pub fn list_user_rules(conn: &Connection) -> Result<Vec<PayeeRule>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, pattern, category_id, hit_count FROM payee_rules
             ORDER BY hit_count DESC, length(pattern) DESC, pattern",
        )
        .map_err(|e| format!("prepare list rules: {e}"))?;
    let rows = stmt
        .query_map([], rule_from_row)
        .map_err(|e| format!("query rules: {e}"))?;
    let rules: Vec<PayeeRule> = rows
        .collect::<rusqlite::Result<_>>()
        .map_err(|e| format!("read rules: {e}"))?;
    Ok(rules)
}

/// Creates or updates a user rule. The pattern is normalized and must be at least two
/// characters. An existing pattern gets the new category and its `hit_count` goes up by one.
pub fn upsert_user_rule(
    conn: &Connection,
    pattern: &str,
    category_id: &str,
) -> Result<PayeeRule, String> {
    let pattern = normalize(pattern);
    if pattern.chars().count() < 2 {
        return Err("pattern must be at least 2 characters".to_string());
    }
    let category_id = category_id.trim();

    let category_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM categories WHERE id = ?1)",
            params![category_id],
            |r| r.get(0),
        )
        .map_err(|e| format!("check category: {e}"))?;
    if !category_exists {
        return Err(format!("unknown category: {category_id}"));
    }

    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO payee_rules (id, pattern, category_id, hit_count)
         VALUES (?1, ?2, ?3, 1)
         ON CONFLICT(pattern) DO UPDATE SET
            category_id = excluded.category_id,
            hit_count = hit_count + 1",
        params![id, pattern, category_id],
    )
    .map_err(|e| format!("save rule: {e}"))?;

    conn.query_row(
        "SELECT id, pattern, category_id, hit_count FROM payee_rules WHERE pattern = ?1",
        params![pattern],
        rule_from_row,
    )
    .map_err(|e| format!("read saved rule: {e}"))
}

/// Deletes a rule by id. This applies to seeded rows too. Missing ids return an error.
pub fn delete_user_rule(conn: &Connection, id: &str) -> Result<(), String> {
    let removed = conn
        .execute("DELETE FROM payee_rules WHERE id = ?1", params![id])
        .map_err(|e| format!("delete rule: {e}"))?;
    if removed == 0 {
        return Err(format!("rule not found: {id}"));
    }
    Ok(())
}

/// Categorizes every spending record that has no category yet, using its payee, note and
/// joined slip OCR text. Returns how many records were updated.
pub fn auto_categorize_uncategorized(conn: &Connection) -> Result<usize, String> {
    // (record id, payee_raw, note, joined slip OCR text)
    type Candidate = (String, Option<String>, Option<String>, Option<String>);
    let candidates: Vec<Candidate> = {
        let mut stmt = conn
            .prepare(
                "SELECT r.id, r.payee_raw, r.note,
                        (SELECT group_concat(s.ocr_text, char(10))
                           FROM slips s WHERE s.record_id = r.id)
                 FROM records r
                 WHERE r.kind = 'spending' AND r.category_id IS NULL",
            )
            .map_err(|e| format!("prepare uncategorized query: {e}"))?;
        let rows = stmt
            .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)))
            .map_err(|e| format!("query uncategorized: {e}"))?;
        let collected: Vec<_> = rows
            .collect::<rusqlite::Result<_>>()
            .map_err(|e| format!("read uncategorized: {e}"))?;
        collected
    };

    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("begin categorize: {e}"))?;
    let mut updated = 0usize;
    for (id, payee, note, ocr) in &candidates {
        let Some(category) =
            classify_local(conn, payee.as_deref(), note.as_deref(), ocr.as_deref())
        else {
            continue;
        };
        updated += tx
            .execute(
                "UPDATE records SET category_id = ?1 WHERE id = ?2 AND category_id IS NULL",
                params![category, id],
            )
            .map_err(|e| format!("update category: {e}"))?;
    }
    tx.commit().map_err(|e| format!("commit categorize: {e}"))?;
    Ok(updated)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    const SPENDING_IDS: &[&str] = &[
        "cat_food",
        "cat_transport",
        "cat_necessities",
        "cat_shopping",
        "cat_entertainment",
        "cat_home",
        "cat_health",
        "cat_family",
        "cat_giving",
        "cat_travel",
        "cat_education",
        "cat_work",
        "cat_invest",
        "cat_loans",
        "cat_other_spend",
    ];
    const INCOME_IDS: &[&str] = &[
        "cat_salary",
        "cat_wages",
        "cat_gifts_in",
        "cat_trade",
        "cat_cashback",
        "cat_other_in",
    ];

    fn test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE categories (
                id TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_th TEXT NOT NULL,
                kind TEXT NOT NULL, icon TEXT NOT NULL, color TEXT NOT NULL,
                is_system INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0,
                archived INTEGER NOT NULL DEFAULT 0);
             CREATE TABLE payee_rules (
                id TEXT PRIMARY KEY, pattern TEXT NOT NULL UNIQUE,
                category_id TEXT NOT NULL, kind_override TEXT,
                hit_count INTEGER NOT NULL DEFAULT 1);
             CREATE TABLE records (
                id TEXT PRIMARY KEY, kind TEXT NOT NULL, amount_satang INTEGER NOT NULL,
                currency TEXT NOT NULL DEFAULT 'THB', local_date TEXT NOT NULL,
                category_id TEXT, payee_raw TEXT, note TEXT,
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
             CREATE TABLE slips (
                id TEXT PRIMARY KEY, record_id TEXT NOT NULL,
                content_sha256 TEXT NOT NULL UNIQUE, ocr_text TEXT,
                parsed_at TEXT NOT NULL);",
        )
        .unwrap();
        for id in SPENDING_IDS {
            conn.execute(
                "INSERT INTO categories (id, name_en, name_th, kind, icon, color)
                 VALUES (?1, ?1, ?1, 'spending', 'circle', '#000000')",
                params![id],
            )
            .unwrap();
        }
        for id in INCOME_IDS {
            conn.execute(
                "INSERT INTO categories (id, name_en, name_th, kind, icon, color)
                 VALUES (?1, ?1, ?1, 'income', 'circle', '#000000')",
                params![id],
            )
            .unwrap();
        }
        conn
    }

    fn classify(conn: &Connection, payee: Option<&str>, note: Option<&str>) -> Option<String> {
        classify_local(conn, payee, note, None)
    }

    fn insert_record(
        conn: &Connection,
        id: &str,
        kind: &str,
        category: Option<&str>,
        payee: Option<&str>,
        note: Option<&str>,
    ) {
        conn.execute(
            "INSERT INTO records (id, kind, amount_satang, local_date, category_id, payee_raw, note, created_at, updated_at)
             VALUES (?1, ?2, 10000, '2026-01-01', ?3, ?4, ?5, '2026-01-01T00:00:00+07:00', '2026-01-01T00:00:00+07:00')",
            params![id, kind, category, payee, note],
        )
        .unwrap();
    }

    fn category_of(conn: &Connection, id: &str) -> Option<String> {
        conn.query_row(
            "SELECT category_id FROM records WHERE id = ?1",
            params![id],
            |r| r.get(0),
        )
        .unwrap()
    }

    #[test]
    fn income_rules_are_not_applied_to_spending() {
        let conn = test_db();
        // Learned from income records: Shopee cashback, and money a friend sent.
        upsert_user_rule(&conn, "shopee", "cat_cashback").unwrap();
        upsert_user_rule(&conn, "test friend", "cat_gifts_in").unwrap();

        // Spending at Shopee falls through to the built-in spending rule.
        assert_eq!(classify(&conn, Some("SHOPEE"), None).as_deref(), Some("cat_shopping"));
        // Paying the friend back must not become an income category.
        assert_eq!(classify(&conn, Some("Test Friend"), None), None);

        insert_record(&conn, "r1", "spending", None, Some("Shopee"), None);
        auto_categorize_uncategorized(&conn).unwrap();
        assert_eq!(category_of(&conn, "r1").as_deref(), Some("cat_shopping"));
    }

    #[test]
    fn builtin_dictionary_is_well_formed() {
        let rules = builtin_merchant_rules();
        assert!(
            (150..=250).contains(&rules.len()),
            "expected 150..=250 entries, got {}",
            rules.len()
        );
        let mut seen = HashSet::new();
        for (pattern, category) in rules {
            assert!(!pattern.is_empty());
            assert_eq!(
                *pattern,
                normalize(pattern),
                "pattern must be normalized: {pattern}"
            );
            assert!(seen.insert(*pattern), "duplicate pattern: {pattern}");
            assert!(
                SPENDING_IDS.contains(category),
                "unknown spending category {category} for {pattern}"
            );
        }
    }

    #[test]
    fn grabfood_beats_grab() {
        let conn = test_db();
        assert_eq!(
            classify(&conn, Some("GrabFood Bangkok"), None).as_deref(),
            Some("cat_food")
        );
        assert_eq!(
            classify(&conn, Some("Grab *1234"), None).as_deref(),
            Some("cat_transport")
        );
        assert_eq!(longest_builtin_category("grabfood", 0), Some("cat_food"));
    }

    #[test]
    fn kbank_card_bill_is_loans() {
        let conn = test_db();
        assert_eq!(
            classify(&conn, Some("KBank PLUSTINUM"), None).as_deref(),
            Some("cat_loans")
        );
        assert_eq!(
            classify(&conn, Some("KBANK PLATINUM"), None).as_deref(),
            Some("cat_loans")
        );
    }

    #[test]
    fn thai_keywords_classify() {
        let conn = test_db();
        assert_eq!(
            classify(&conn, Some("ร้านก๋วยเตี๋ยวเรือ"), None).as_deref(),
            Some("cat_food")
        );
        assert_eq!(
            classify(&conn, Some("การไฟฟ้านครหลวง"), None).as_deref(),
            Some("cat_home")
        );
        assert_eq!(
            classify(&conn, Some("ค่าน้ำมัน"), None).as_deref(),
            Some("cat_transport"),
            "fuel must beat the shorter water-bill stem"
        );
        assert_eq!(
            classify(&conn, Some("ค่าน้ำ"), None).as_deref(),
            Some("cat_home")
        );
    }

    #[test]
    fn memo_fallback_when_payee_is_missing_or_unknown() {
        let conn = test_db();
        assert_eq!(
            classify(&conn, None, Some("OpenCode go")).as_deref(),
            Some("cat_work")
        );
        assert_eq!(
            classify(&conn, None, Some("cloudfare")).as_deref(),
            Some("cat_work")
        );
        assert_eq!(
            classify(&conn, Some("Transfer"), Some("cloudfare")).as_deref(),
            Some("cat_work")
        );
    }

    #[test]
    fn short_ascii_patterns_match_whole_words_only() {
        let conn = test_db();
        assert_eq!(classify(&conn, Some("Peanut butter"), None), None);
        assert_eq!(classify(&conn, Some("Laptops"), None), None);
        assert_eq!(
            classify(&conn, Some("PEA"), None).as_deref(),
            Some("cat_home")
        );
    }

    #[test]
    fn payee_is_tested_before_note_and_ocr() {
        let conn = test_db();
        assert_eq!(
            classify_local(
                &conn,
                Some("Starbucks"),
                Some("Bangkok Smartcard"),
                Some("KBank PLUSTINUM")
            )
            .as_deref(),
            Some("cat_food")
        );
    }

    #[test]
    fn ocr_uses_only_long_brand_and_biller_names() {
        let conn = test_db();
        assert_eq!(
            classify_local(
                &conn,
                Some("Transfer"),
                None,
                Some("BANGKOK SMARTCARD top-up")
            )
            .as_deref(),
            Some("cat_transport")
        );
        assert_eq!(
            classify_local(&conn, None, None, Some("KBank PLUSTINUM Card")).as_deref(),
            Some("cat_loans")
        );
        // Short generic stems are too noisy to trust in OCR text.
        assert_eq!(classify_local(&conn, None, None, Some("วัด")), None);
        assert_eq!(classify_local(&conn, None, None, Some("กาแฟ")), None);
    }

    #[test]
    fn user_rule_overrides_builtin() {
        let conn = test_db();
        assert_eq!(
            classify(&conn, Some("Grab Bangkok"), None).as_deref(),
            Some("cat_transport")
        );
        upsert_user_rule(&conn, "Grab", "cat_work").unwrap();
        assert_eq!(
            classify(&conn, Some("Grab Bangkok"), None).as_deref(),
            Some("cat_work")
        );
        assert_eq!(
            classify(&conn, Some("Starbucks"), None).as_deref(),
            Some("cat_food"),
            "unrelated built-ins are unaffected"
        );
    }

    #[test]
    fn user_rule_on_note_beats_builtin_on_payee() {
        let conn = test_db();
        upsert_user_rule(&conn, "coffee with client", "cat_work").unwrap();
        assert_eq!(
            classify(&conn, Some("Starbucks"), Some("Coffee with client")).as_deref(),
            Some("cat_work")
        );
    }

    #[test]
    fn exact_match_beats_substring_and_hit_count_orders_substrings() {
        let conn = test_db();
        upsert_user_rule(&conn, "bts", "cat_shopping").unwrap();
        upsert_user_rule(&conn, "bts skytrain", "cat_work").unwrap();
        conn.execute(
            "UPDATE payee_rules SET hit_count = 10 WHERE pattern = 'bts'",
            [],
        )
        .unwrap();

        // Exact normalized match wins even though "bts" has more hits.
        assert_eq!(
            classify(&conn, Some("BTS Skytrain"), None).as_deref(),
            Some("cat_work")
        );
        // Substring matches are ordered by hit_count, so "bts" (10 hits) wins.
        assert_eq!(
            classify(&conn, Some("BTS Skytrain top-up"), None).as_deref(),
            Some("cat_shopping")
        );
    }

    #[test]
    fn upsert_normalizes_updates_and_validates() {
        let conn = test_db();
        let first = upsert_user_rule(&conn, "  My   Cafe ", "cat_food").unwrap();
        assert_eq!(first.pattern, "my cafe");
        assert_eq!(first.category_id, "cat_food");
        assert!(!first.is_builtin);

        let second = upsert_user_rule(&conn, "My Cafe", "cat_work").unwrap();
        assert_eq!(second.id, first.id, "same pattern keeps its row");
        assert_eq!(second.category_id, "cat_work");
        assert_eq!(second.hit_count, 2);
        assert_eq!(list_user_rules(&conn).unwrap().len(), 1);

        assert!(upsert_user_rule(&conn, "Anything", "cat_missing").is_err());
        assert!(upsert_user_rule(&conn, "   ", "cat_food").is_err());
        assert!(upsert_user_rule(&conn, "x", "cat_food").is_err());
    }

    #[test]
    fn delete_removes_rule_and_reports_missing() {
        let conn = test_db();
        let rule = upsert_user_rule(&conn, "my cafe", "cat_food").unwrap();
        delete_user_rule(&conn, &rule.id).unwrap();
        assert!(list_user_rules(&conn).unwrap().is_empty());
        assert!(delete_user_rule(&conn, &rule.id).is_err());
    }

    #[test]
    fn list_flags_seeded_rows_as_builtin() {
        let conn = test_db();
        conn.execute(
            "INSERT INTO payee_rules (id, pattern, category_id, hit_count)
             VALUES ('seed_bts', 'bts', 'cat_transport', 1)",
            [],
        )
        .unwrap();
        upsert_user_rule(&conn, "my cafe", "cat_food").unwrap();

        let rules = list_user_rules(&conn).unwrap();
        let seeded = rules.iter().find(|r| r.pattern == "bts").unwrap();
        let user = rules.iter().find(|r| r.pattern == "my cafe").unwrap();
        assert!(seeded.is_builtin);
        assert!(!user.is_builtin);
    }

    #[test]
    fn auto_categorize_updates_only_uncategorized_spending() {
        let conn = test_db();
        insert_record(
            &conn,
            "r_food",
            "spending",
            None,
            Some("Starbucks Siam"),
            None,
        );
        insert_record(
            &conn,
            "r_unknown",
            "spending",
            None,
            Some("Unknown Shop"),
            None,
        );
        insert_record(&conn, "r_income", "income", None, Some("Netflix"), None);
        insert_record(
            &conn,
            "r_done",
            "spending",
            Some("cat_shopping"),
            Some("Starbucks"),
            None,
        );
        insert_record(&conn, "r_ocr", "spending", None, None, None);
        insert_record(&conn, "r_memo", "spending", None, None, Some("OpenCode go"));
        conn.execute(
            "INSERT INTO slips (id, record_id, content_sha256, ocr_text, parsed_at)
             VALUES ('s1', 'r_ocr', 'sha-1', 'KBank PLUSTINUM', '2026-01-01T00:00:00+07:00')",
            [],
        )
        .unwrap();

        let updated = auto_categorize_uncategorized(&conn).unwrap();
        assert_eq!(updated, 3);
        assert_eq!(category_of(&conn, "r_food").as_deref(), Some("cat_food"));
        assert_eq!(category_of(&conn, "r_ocr").as_deref(), Some("cat_loans"));
        assert_eq!(category_of(&conn, "r_memo").as_deref(), Some("cat_work"));
        assert_eq!(category_of(&conn, "r_unknown"), None);
        assert_eq!(category_of(&conn, "r_income"), None);
        assert_eq!(
            category_of(&conn, "r_done").as_deref(),
            Some("cat_shopping")
        );

        // A second run finds nothing new to do.
        assert_eq!(auto_categorize_uncategorized(&conn).unwrap(), 0);
    }
}
