use std::path::Path;
use std::sync::Mutex;

use chrono::{Datelike, Duration, Local, NaiveDate};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::banks::ALL_BANKS;

pub struct DbState(pub Mutex<Connection>);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: String,
    pub name_en: String,
    pub name_th: String,
    pub kind: String,
    pub bank_code: Option<String>,
    pub color: String,
    pub uses_shared_album: bool,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: String,
    pub name_en: String,
    pub name_th: String,
    pub kind: String,
    pub icon: String,
    pub color: String,
    pub is_system: bool,
    pub sort_order: i32,
    pub archived: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
    pub disabled: bool,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordItem {
    pub id: String,
    pub kind: String,
    pub amount_satang: i64,
    pub currency: String,
    pub local_date: String,
    pub local_time: Option<String>,
    pub account_id: Option<String>,
    pub category_id: Option<String>,
    pub payee_raw: Option<String>,
    pub note: Option<String>,
    pub source: String,
    pub parse_status: String,
    pub is_reviewed: bool,
    pub recurring_rule_id: Option<String>,
    pub tag_ids: Vec<String>,
    pub slip_ref: Option<String>,
    pub slip_qr_raw: Option<String>,
    pub slip_ocr_text: Option<String>,
    pub slip_image_path: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordInput {
    pub id: Option<String>,
    pub kind: String,
    pub amount_satang: i64,
    pub local_date: String,
    pub local_time: Option<String>,
    pub account_id: Option<String>,
    pub category_id: Option<String>,
    pub payee_raw: Option<String>,
    pub note: Option<String>,
    pub tag_ids: Vec<String>,
    pub recurring_frequency: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FutureRecordItem {
    pub rule_id: String,
    pub kind: String,
    pub amount_satang: i64,
    pub due_date: String,
    pub category_id: Option<String>,
    pub note: Option<String>,
    pub frequency: String,
    pub day_of_month: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub language: String,
    pub month_start_day: i32,
    pub week_start_day: i32,
    pub default_view: String,
    pub allow_shared_album: bool,
    pub owner_names: Vec<String>,
    pub akson_ocr_api_key: String,
    pub akson_ocr_model: String,
    pub english_ocr_engine: String,
    /// Fingerprint / phone-PIN lock (#79). Off by default; older frontends that don't send it keep it off.
    #[serde(default)]
    pub app_lock_enabled: bool,
    /// Opt-in daily reminder (#80). Older frontends that don't send these keep it off at 20:00.
    #[serde(default)]
    pub reminder_enabled: bool,
    /// Local time of day, `HH:MM`.
    #[serde(default = "default_reminder_time")]
    pub reminder_time: String,
}

fn default_reminder_time() -> String {
    "20:00".to_string()
}

/// `HH:MM` with a real hour and minute, or None.
pub fn valid_reminder_time(v: &str) -> Option<String> {
    let (h, m) = v.split_once(':')?;
    if h.len() != 2 || m.len() != 2 {
        return None;
    }
    let (h, m) = (h.parse::<u8>().ok()?, m.parse::<u8>().ok()?);
    (h < 24 && m < 60).then(|| format!("{h:02}:{m:02}"))
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            language: "en".to_string(),
            month_start_day: 1,
            week_start_day: 0,
            default_view: "monthly".to_string(),
            allow_shared_album: false,
            owner_names: Vec::new(),
            akson_ocr_api_key: String::new(),
            akson_ocr_model: "AksonOCR-preview".to_string(),
            english_ocr_engine: "mlkit_latin".to_string(),
            app_lock_enabled: false,
            reminder_enabled: false,
            reminder_time: default_reminder_time(),
        }
    }
}

pub fn init_db(db_path: &Path) -> Result<Connection, String> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("create db dir: {e}"))?;
    }
    let conn = Connection::open(db_path).map_err(|e| format!("open sqlite: {e}"))?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            name_en TEXT NOT NULL,
            name_th TEXT NOT NULL,
            kind TEXT NOT NULL,
            bank_code TEXT,
            color TEXT NOT NULL,
            uses_shared_album INTEGER NOT NULL DEFAULT 0,
            enabled INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name_en TEXT NOT NULL,
            name_th TEXT NOT NULL,
            kind TEXT NOT NULL,
            icon TEXT NOT NULL,
            color TEXT NOT NULL,
            is_system INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            archived INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL DEFAULT '#3b82f6',
            disabled INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS recurring_rules (
            id TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            amount_satang INTEGER NOT NULL,
            category_id TEXT,
            account_id TEXT,
            note TEXT,
            payee_raw TEXT,
            tag_ids TEXT NOT NULL DEFAULT '[]',
            frequency TEXT NOT NULL,
            day_of_month INTEGER,
            next_run_date TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS records (
            id TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            amount_satang INTEGER NOT NULL,
            currency TEXT NOT NULL DEFAULT 'THB',
            local_date TEXT NOT NULL,
            local_time TEXT,
            account_id TEXT,
            category_id TEXT,
            payee_raw TEXT,
            payee_normalized TEXT,
            note TEXT,
            source TEXT NOT NULL DEFAULT 'manual',
            parse_status TEXT NOT NULL DEFAULT 'ok',
            is_reviewed INTEGER NOT NULL DEFAULT 1,
            recurring_rule_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_records_date ON records(local_date DESC);
        CREATE INDEX IF NOT EXISTS idx_records_kind ON records(kind);
        CREATE INDEX IF NOT EXISTS idx_records_category ON records(category_id);
        CREATE INDEX IF NOT EXISTS idx_records_account ON records(account_id);

        CREATE TABLE IF NOT EXISTS record_tags (
            record_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            PRIMARY KEY (record_id, tag_id),
            FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS slips (
            id TEXT PRIMARY KEY,
            record_id TEXT NOT NULL,
            media_store_id TEXT,
            content_sha256 TEXT NOT NULL UNIQUE,
            sending_bank TEXT,
            trans_ref TEXT,
            qr_raw TEXT,
            ocr_text TEXT,
            image_path TEXT,
            parsed_at TEXT NOT NULL,
            FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_slips_bank_ref
            ON slips(sending_bank, trans_ref)
            WHERE sending_bank IS NOT NULL AND trans_ref IS NOT NULL;

        CREATE TABLE IF NOT EXISTS payee_rules (
            id TEXT PRIMARY KEY,
            pattern TEXT NOT NULL UNIQUE,
            category_id TEXT NOT NULL,
            kind_override TEXT,
            hit_count INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS budgets (
            id TEXT PRIMARY KEY,
            scope_type TEXT NOT NULL,
            scope_id TEXT,
            period_type TEXT NOT NULL DEFAULT 'monthly',
            limit_satang INTEGER NOT NULL,
            alert_threshold_pct INTEGER NOT NULL DEFAULT 80,
            active INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS activity_log (
            local_date TEXT PRIMARY KEY,
            slips_synced INTEGER NOT NULL DEFAULT 0,
            records_categorized INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS scanned_media (
            media_store_id TEXT PRIMARY KEY,
            scanned_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS scanned_months (
            year_month TEXT PRIMARY KEY
        );
        "#,
    )
    .map_err(|e| format!("run migrations: {e}"))?;

    // Safe additive migration for existing SQLite databases
    let _ = conn.execute("ALTER TABLE slips ADD COLUMN image_path TEXT", []);
    add_recurring_rule_templates(&conn)?;

    seed_defaults(&conn)?;
    Ok(conn)
}

/// Recurring rules store the payee and tags they post with. Rules saved before
/// these columns existed copy them from the record they were created from.
fn add_recurring_rule_templates(conn: &Connection) -> Result<(), String> {
    let has_payee: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('recurring_rules') WHERE name = 'payee_raw'",
            [],
            |r| r.get(0),
        )
        .map_err(|e| format!("inspect recurring rules: {e}"))?;
    if has_payee > 0 {
        return Ok(());
    }
    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("migrate recurring rules: {e}"))?;
    tx.execute_batch(
        r#"
        ALTER TABLE recurring_rules ADD COLUMN payee_raw TEXT;
        ALTER TABLE recurring_rules ADD COLUMN tag_ids TEXT NOT NULL DEFAULT '[]';
        UPDATE recurring_rules SET
            payee_raw = (
                SELECT r.payee_raw FROM records r
                WHERE r.recurring_rule_id = recurring_rules.id
                ORDER BY r.created_at LIMIT 1
            ),
            tag_ids = (
                SELECT json_group_array(rt.tag_id) FROM record_tags rt
                WHERE rt.record_id = (
                    SELECT r.id FROM records r
                    WHERE r.recurring_rule_id = recurring_rules.id
                    ORDER BY r.created_at LIMIT 1
                )
            );
        "#,
    )
    .map_err(|e| format!("migrate recurring rules: {e}"))?;
    tx.commit()
        .map_err(|e| format!("migrate recurring rules: {e}"))
}

fn seed_defaults(conn: &Connection) -> Result<(), String> {
    // Seed all 20 Thai banks/wallets + Cash
    for bank in ALL_BANKS {
        conn.execute(
            "INSERT OR IGNORE INTO accounts (id, name_en, name_th, kind, bank_code, color, uses_shared_album, enabled)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)",
            params![
                bank.id,
                bank.name_en,
                bank.name_th,
                bank.kind,
                bank.bot_code,
                bank.color,
                if bank.uses_shared_album { 1 } else { 0 }
            ],
        )
        .map_err(|e| format!("seed bank {}: {e}", bank.id))?;
    }

    conn.execute(
        "INSERT OR IGNORE INTO accounts (id, name_en, name_th, kind, bank_code, color, uses_shared_album, enabled)
         VALUES ('cash', 'Cash', 'เงินสด', 'cash', NULL, '#10b981', 0, 1)",
        [],
    )
    .map_err(|e| format!("seed cash: {e}"))?;

    // 15 default Spending categories + 6 default Income categories
    let default_categories: &[(&str, &str, &str, &str, &str, &str, i32)] = &[
        ("cat_food", "Food", "อาหารและเครื่องดื่ม", "spending", "utensils", "#f97316", 1),
        ("cat_transport", "Transport & car", "เดินทางและรถยนต์", "spending", "car", "#06b6d4", 2),
        ("cat_necessities", "Necessities", "ของใช้จำเป็น", "spending", "shopping-basket", "#eab308", 3),
        ("cat_shopping", "Shopping", "ช้อปปิ้ง", "spending", "shopping-bag", "#ec4899", 4),
        ("cat_entertainment", "Entertainment", "บันเทิง", "spending", "film", "#ef4444", 5),
        ("cat_home", "Home & utilities", "บ้านและสาธารณูปโภค", "spending", "home", "#3b82f6", 6),
        ("cat_health", "Health & wellness", "สุขภาพ", "spending", "heart-pulse", "#14b8a6", 7),
        ("cat_family", "Family & pets", "ครอบครัวและสัตว์เลี้ยง", "spending", "users", "#a855f7", 8),
        ("cat_giving", "Giving", "ให้และทำบุญ", "spending", "gift", "#8b5cf6", 9),
        ("cat_travel", "Travel", "ท่องเที่ยว", "spending", "plane", "#0ea5e9", 10),
        ("cat_education", "Education", "การศึกษา", "spending", "graduation-cap", "#6366f1", 11),
        ("cat_work", "Work & business", "งานและธุรกิจ", "spending", "briefcase", "#d97706", 12),
        ("cat_invest", "Save & invest", "ออมและลงทุน", "spending", "trending-up", "#84cc16", 13),
        ("cat_loans", "Loans & cards", "สินเชื่อและบัตรเครดิต", "spending", "credit-card", "#64748b", 14),
        ("cat_other_spend", "Other", "อื่นๆ", "spending", "ellipsis", "#94a3b8", 15),
        ("cat_salary", "Salary", "เงินเดือน", "income", "wallet", "#22c55e", 1),
        ("cat_wages", "Wages", "ค่าจ้าง", "income", "hand-coins", "#10b981", 2),
        ("cat_gifts_in", "Gifts", "ของขวัญ / โบนัส", "income", "gift", "#84cc16", 3),
        ("cat_trade", "Trade & business", "ค้าขาย / ธุรกิจ", "income", "store", "#14b8a6", 4),
        ("cat_cashback", "Cashback", "เงินคืน", "income", "rotate-ccw", "#06b6d4", 5),
        ("cat_other_in", "Other", "อื่นๆ", "income", "ellipsis", "#94a3b8", 6),
    ];

    for (id, en, th, kind, icon, color, order) in default_categories {
        conn.execute(
            "INSERT OR IGNORE INTO categories (id, name_en, name_th, kind, icon, color, is_system, sort_order, archived)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, 0)",
            params![id, en, th, kind, icon, color, order],
        )
        .map_err(|e| format!("seed category {id}: {e}"))?;
    }

    // Starter Thai merchant auto-categorization rules
    let merchant_seeds: &[(&str, &str)] = &[
        ("7-eleven", "cat_food"),
        ("cp all", "cat_food"),
        ("starbucks", "cat_food"),
        ("cafe amazon", "cat_food"),
        ("central restaurants", "cat_food"),
        ("mk restaurant", "cat_food"),
        ("grabfood", "cat_food"),
        ("lineman", "cat_food"),
        ("bangkok smartcard", "cat_transport"),
        ("bts", "cat_transport"),
        ("mrt", "cat_transport"),
        ("bem", "cat_transport"),
        ("ptt", "cat_transport"),
        ("bangchak", "cat_transport"),
        ("grab", "cat_transport"),
        ("bolt", "cat_transport"),
        ("shopee", "cat_shopping"),
        ("lazada", "cat_shopping"),
        ("lotus", "cat_necessities"),
        ("big c", "cat_necessities"),
        ("makro", "cat_necessities"),
        ("netflix", "cat_entertainment"),
        ("spotify", "cat_entertainment"),
        ("youtube", "cat_entertainment"),
        ("major cineplex", "cat_entertainment"),
        ("sf cinema", "cat_entertainment"),
        ("mea", "cat_home"),
        ("pea", "cat_home"),
        ("mwa", "cat_home"),
        ("ais", "cat_home"),
        ("true", "cat_home"),
        ("dtac", "cat_home"),
    ];
    for (pattern, cat_id) in merchant_seeds {
        let id = format!("seed_{}", pattern.replace(' ', "_"));
        conn.execute(
            "INSERT OR IGNORE INTO payee_rules (id, pattern, category_id, hit_count) VALUES (?1, ?2, ?3, 1)",
            params![id, pattern, cat_id],
        )
        .map_err(|e| format!("seed merchant {pattern}: {e}"))?;
    }

    Ok(())
}

pub fn load_settings(conn: &Connection) -> Result<AppSettings, String> {
    let mut s = AppSettings::default();
    let mut stmt = conn
        .prepare("SELECT key, value FROM app_settings")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        .map_err(|e| e.to_string())?;

    for row in rows {
        let (k, v) = row.map_err(|e| e.to_string())?;
        match k.as_str() {
            "language" => s.language = v,
            "month_start_day" => {
                if let Ok(n) = v.parse::<i32>() {
                    s.month_start_day = n.clamp(1, 28);
                }
            }
            "week_start_day" => {
                if let Ok(n) = v.parse::<i32>() {
                    s.week_start_day = n.clamp(0, 6);
                }
            }
            "default_view" => s.default_view = v,
            "allow_shared_album" => s.allow_shared_album = v == "true",
            "owner_names" => {
                if let Ok(names) = serde_json::from_str::<Vec<String>>(&v) {
                    s.owner_names = names;
                }
            }
            "akson_ocr_api_key" => s.akson_ocr_api_key = v,
            "akson_ocr_model" => s.akson_ocr_model = v,
            "english_ocr_engine" => s.english_ocr_engine = v,
            "app_lock_enabled" => s.app_lock_enabled = v == "true",
            "reminder_enabled" => s.reminder_enabled = v == "true",
            "reminder_time" => {
                if let Some(t) = valid_reminder_time(&v) {
                    s.reminder_time = t;
                }
            }
            _ => {}
        }
    }
    Ok(s)
}

pub fn save_settings(conn: &Connection, s: &AppSettings) -> Result<(), String> {
    let pairs: Vec<(&str, String)> = vec![
        ("language", s.language.clone()),
        ("month_start_day", s.month_start_day.clamp(1, 28).to_string()),
        ("week_start_day", s.week_start_day.clamp(0, 6).to_string()),
        ("default_view", s.default_view.clone()),
        ("allow_shared_album", s.allow_shared_album.to_string()),
        (
            "owner_names",
            serde_json::to_string(&s.owner_names).unwrap_or_else(|_| "[]".to_string()),
        ),
        ("akson_ocr_api_key", s.akson_ocr_api_key.clone()),
        ("akson_ocr_model", s.akson_ocr_model.clone()),
        ("english_ocr_engine", s.english_ocr_engine.clone()),
        ("app_lock_enabled", s.app_lock_enabled.to_string()),
        ("reminder_enabled", s.reminder_enabled.to_string()),
        (
            "reminder_time",
            valid_reminder_time(&s.reminder_time).unwrap_or_else(default_reminder_time),
        ),
    ];
    for (k, v) in pairs {
        conn.execute(
            "INSERT INTO app_settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![k, v],
        )
        .map_err(|e| format!("save setting {k}: {e}"))?;
    }
    Ok(())
}

pub fn list_known_media_ids(conn: &Connection) -> Result<Vec<String>, String> {
    let mut ids = Vec::new();
    let mut slips = conn
        .prepare(
            "SELECT media_store_id FROM slips
             WHERE media_store_id IS NOT NULL AND media_store_id != ''",
        )
        .map_err(|e| format!("prepare known slips: {e}"))?;
    let slip_rows = slips
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("query known slips: {e}"))?;
    for row in slip_rows {
        ids.push(row.map_err(|e| e.to_string())?);
    }
    let mut seen = conn
        .prepare("SELECT media_store_id FROM scanned_media")
        .map_err(|e| format!("prepare scanned media: {e}"))?;
    let seen_rows = seen
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("query scanned media: {e}"))?;
    for row in seen_rows {
        ids.push(row.map_err(|e| e.to_string())?);
    }
    ids.sort();
    ids.dedup();
    Ok(ids)
}

pub fn list_scanned_months(conn: &Connection) -> Result<Vec<String>, String> {
    let mut stmt = conn
        .prepare("SELECT year_month FROM scanned_months ORDER BY year_month DESC")
        .map_err(|e| format!("prepare scanned months: {e}"))?;
    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("query scanned months: {e}"))?;
    let mut months = Vec::new();
    for row in rows {
        months.push(row.map_err(|e| e.to_string())?);
    }
    Ok(months)
}

pub fn remember_scanned_months(conn: &Connection, months: &[String]) -> Result<(), String> {
    for month in months {
        let month = month.trim();
        if month.len() != 7 || !month.as_bytes().get(4).is_some_and(|b| *b == b'-') {
            continue;
        }
        conn.execute(
            "INSERT OR IGNORE INTO scanned_months (year_month) VALUES (?1)",
            params![month],
        )
        .map_err(|e| format!("remember scanned month: {e}"))?;
    }
    Ok(())
}

pub fn remember_scanned_media(conn: &Connection, ids: &[String]) -> Result<(), String> {
    let now = Local::now().to_rfc3339();
    for id in ids {
        let id = id.trim();
        if id.is_empty() {
            continue;
        }
        conn.execute(
            "INSERT OR IGNORE INTO scanned_media (media_store_id, scanned_at) VALUES (?1, ?2)",
            params![id, now],
        )
        .map_err(|e| format!("remember scanned media: {e}"))?;
    }
    Ok(())
}

pub fn normalize_payee(raw: &str) -> String {
    raw.trim()
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn guess_category_for_payee(conn: &Connection, payee_raw: &str) -> Option<String> {
    let norm = normalize_payee(payee_raw);
    if norm.is_empty() {
        return None;
    }
    // Exact match first
    if let Ok(Some(cat)) = conn
        .query_row(
            "SELECT category_id FROM payee_rules WHERE pattern = ?1 ORDER BY hit_count DESC LIMIT 1",
            params![norm],
            |r| r.get::<_, String>(0),
        )
        .optional()
    {
        return Some(cat);
    }
    // Substring match against rules
    if let Ok(mut stmt) =
        conn.prepare("SELECT pattern, category_id FROM payee_rules ORDER BY hit_count DESC, length(pattern) DESC")
    {
        if let Ok(rows) = stmt.query_map([], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
        }) {
            for row in rows.flatten() {
                if !row.0.is_empty() && norm.contains(&row.0) {
                    return Some(row.1);
                }
            }
        }
    }
    None
}

pub fn learn_payee_category(conn: &Connection, payee_raw: &str, category_id: &str) {
    let norm = normalize_payee(payee_raw);
    if norm.len() < 2 {
        return;
    }
    let id = Uuid::new_v4().to_string();
    let _ = conn.execute(
        "INSERT INTO payee_rules (id, pattern, category_id, hit_count)
         VALUES (?1, ?2, ?3, 1)
         ON CONFLICT(pattern) DO UPDATE SET category_id = excluded.category_id, hit_count = hit_count + 1",
        params![id, norm, category_id],
    );
}

pub fn record_activity_categorized(conn: &Connection) {
    let today = Local::now().format("%Y-%m-%d").to_string();
    let _ = conn.execute(
        "INSERT INTO activity_log (local_date, slips_synced, records_categorized)
         VALUES (?1, 0, 1)
         ON CONFLICT(local_date) DO UPDATE SET records_categorized = records_categorized + 1",
        params![today],
    );
}

pub fn record_activity_synced(conn: &Connection, count: i32) {
    let today = Local::now().format("%Y-%m-%d").to_string();
    let _ = conn.execute(
        "INSERT INTO activity_log (local_date, slips_synced, records_categorized)
         VALUES (?1, ?2, 0)
         ON CONFLICT(local_date) DO UPDATE SET slips_synced = slips_synced + ?2",
        params![today, count.max(1)],
    );
}

pub fn compute_streaks(conn: &Connection) -> (i32, i32, i32) {
    let today = Local::now().date_naive();
    let mut sync_streak = 0;
    let mut cat_streak = 0;

    for i in 0..365 {
        let d = (today - Duration::days(i)).format("%Y-%m-%d").to_string();
        let row: Option<(i32, i32)> = conn
            .query_row(
                "SELECT slips_synced, records_categorized FROM activity_log WHERE local_date = ?1",
                params![d],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()
            .unwrap_or(None);
        match row {
            Some((s, _)) if s > 0 => sync_streak += 1,
            _ if i == 0 => {} // today may not have synced yet
            _ => break,
        }
    }

    for i in 0..365 {
        let d = (today - Duration::days(i)).format("%Y-%m-%d").to_string();
        let row: Option<(i32, i32)> = conn
            .query_row(
                "SELECT slips_synced, records_categorized FROM activity_log WHERE local_date = ?1",
                params![d],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .optional()
            .unwrap_or(None);
        match row {
            Some((_, c)) if c > 0 => cat_streak += 1,
            _ if i == 0 => {}
            _ => break,
        }
    }

    let best = sync_streak.max(cat_streak);
    let stored_best: i32 = conn
        .query_row(
            "SELECT value FROM app_settings WHERE key = 'best_streak'",
            [],
            |r| r.get::<_, String>(0),
        )
        .optional()
        .ok()
        .flatten()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    let final_best = best.max(stored_best);
    if final_best > stored_best {
        let _ = conn.execute(
            "INSERT INTO app_settings (key, value) VALUES ('best_streak', ?1)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![final_best.to_string()],
        );
    }
    (sync_streak, cat_streak, final_best)
}

pub fn list_accounts(conn: &Connection) -> Result<Vec<Account>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name_en, name_th, kind, bank_code, color, uses_shared_album, enabled
             FROM accounts ORDER BY CASE kind WHEN 'cash' THEN 2 ELSE 1 END, name_en ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(Account {
                id: r.get(0)?,
                name_en: r.get(1)?,
                name_th: r.get(2)?,
                kind: r.get(3)?,
                bank_code: r.get(4)?,
                color: r.get(5)?,
                uses_shared_album: r.get::<_, i32>(6)? != 0,
                enabled: r.get::<_, i32>(7)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn list_categories(conn: &Connection) -> Result<Vec<Category>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name_en, name_th, kind, icon, color, is_system, sort_order, archived
             FROM categories WHERE archived = 0 ORDER BY kind, sort_order, name_en",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(Category {
                id: r.get(0)?,
                name_en: r.get(1)?,
                name_th: r.get(2)?,
                kind: r.get(3)?,
                icon: r.get(4)?,
                color: r.get(5)?,
                is_system: r.get::<_, i32>(6)? != 0,
                sort_order: r.get(7)?,
                archived: r.get::<_, i32>(8)? != 0,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn list_tags(conn: &Connection) -> Result<Vec<Tag>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, color, disabled, sort_order FROM tags ORDER BY disabled, sort_order, name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |r| {
            Ok(Tag {
                id: r.get(0)?,
                name: r.get(1)?,
                color: r.get(2)?,
                disabled: r.get::<_, i32>(3)? != 0,
                sort_order: r.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

pub fn fetch_tags_for_record(conn: &Connection, record_id: &str) -> Vec<String> {
    let Ok(mut stmt) = conn.prepare("SELECT tag_id FROM record_tags WHERE record_id = ?1") else {
        return Vec::new();
    };
    stmt.query_map(params![record_id], |r| r.get::<_, String>(0))
        .map(|it| it.flatten().collect())
        .unwrap_or_default()
}

pub fn upsert_record(conn: &Connection, input: &RecordInput) -> Result<RecordItem, String> {
    let now = Local::now().to_rfc3339();
    let id = input
        .id
        .clone()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let payee_norm = input.payee_raw.as_deref().map(normalize_payee);

    // Optional recurring rule creation
    let mut recurring_rule_id: Option<String> = None;
    if let Some(freq) = input.recurring_frequency.as_deref().filter(|f| !f.is_empty() && *f != "none") {
        let rule_id = Uuid::new_v4().to_string();
        let base_date = NaiveDate::parse_from_str(&input.local_date, "%Y-%m-%d")
            .unwrap_or_else(|_| Local::now().date_naive());
        let next_date = next_occurrence(base_date, freq, Some(base_date.day() as i32));
        let tag_ids = serde_json::to_string(&input.tag_ids).map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO recurring_rules (id, kind, amount_satang, category_id, account_id, note, payee_raw, tag_ids, frequency, day_of_month, next_run_date, active)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 1)",
            params![
                rule_id,
                input.kind,
                input.amount_satang,
                input.category_id,
                input.account_id,
                input.note,
                input.payee_raw,
                tag_ids,
                freq,
                base_date.day() as i32,
                next_date.format("%Y-%m-%d").to_string()
            ],
        )
        .map_err(|e| format!("insert recurring rule: {e}"))?;
        recurring_rule_id = Some(rule_id);
    }

    let exists: bool = conn
        .query_row("SELECT 1 FROM records WHERE id = ?1", params![id], |_| Ok(true))
        .optional()
        .map_err(|e| e.to_string())?
        .unwrap_or(false);

    if exists {
        conn.execute(
            "UPDATE records
             SET kind = ?2, amount_satang = ?3, local_date = ?4, local_time = ?5,
                 account_id = ?6, category_id = ?7, payee_raw = ?8, payee_normalized = ?9,
                 note = ?10, parse_status = 'ok', is_reviewed = 1, updated_at = ?11
             WHERE id = ?1",
            params![
                id,
                input.kind,
                input.amount_satang,
                input.local_date,
                input.local_time,
                input.account_id,
                input.category_id,
                input.payee_raw,
                payee_norm,
                input.note,
                now
            ],
        )
        .map_err(|e| format!("update record: {e}"))?;
    } else {
        conn.execute(
            "INSERT INTO records (
                id, kind, amount_satang, currency, local_date, local_time,
                account_id, category_id, payee_raw, payee_normalized, note,
                source, parse_status, is_reviewed, recurring_rule_id, created_at, updated_at
             ) VALUES (?1, ?2, ?3, 'THB', ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'manual', 'ok', 1, ?11, ?12, ?12)",
            params![
                id,
                input.kind,
                input.amount_satang,
                input.local_date,
                input.local_time,
                input.account_id,
                input.category_id,
                input.payee_raw,
                payee_norm,
                input.note,
                recurring_rule_id,
                now
            ],
        )
        .map_err(|e| format!("insert record: {e}"))?;
    }

    // Sync tags
    conn.execute("DELETE FROM record_tags WHERE record_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    for tag_id in &input.tag_ids {
        let _ = conn.execute(
            "INSERT OR IGNORE INTO record_tags (record_id, tag_id) VALUES (?1, ?2)",
            params![id, tag_id],
        );
    }

    // Learn payee -> category mapping for auto-categorization. Only spending is
    // auto-categorized, and payee rules are unique per pattern, so learning from income
    // would overwrite the payee's spending rule with a rule that is never applied.
    if input.kind == "spending" {
        if let (Some(payee), Some(cat)) =
            (input.payee_raw.as_deref(), input.category_id.as_deref())
        {
            learn_payee_category(conn, payee, cat);
        }
    }
    if input.category_id.is_some() {
        record_activity_categorized(conn);
    }

    get_record_by_id(conn, &id)?.ok_or_else(|| "record disappeared after upsert".to_string())
}

pub fn get_record_by_id(conn: &Connection, id: &str) -> Result<Option<RecordItem>, String> {
    let row = conn
        .query_row(
            "SELECT r.id, r.kind, r.amount_satang, r.currency, r.local_date, r.local_time,
                    r.account_id, r.category_id, r.payee_raw, r.note, r.source, r.parse_status,
                    r.is_reviewed, r.recurring_rule_id, s.trans_ref, s.qr_raw, s.ocr_text, s.image_path, r.created_at
             FROM records r
             LEFT JOIN slips s ON s.record_id = r.id
             WHERE r.id = ?1",
            params![id],
            |r| {
                Ok(RecordItem {
                    id: r.get(0)?,
                    kind: r.get(1)?,
                    amount_satang: r.get(2)?,
                    currency: r.get(3)?,
                    local_date: r.get(4)?,
                    local_time: r.get(5)?,
                    account_id: r.get(6)?,
                    category_id: r.get(7)?,
                    payee_raw: r.get(8)?,
                    note: r.get(9)?,
                    source: r.get(10)?,
                    parse_status: r.get(11)?,
                    is_reviewed: r.get::<_, i32>(12)? != 0,
                    recurring_rule_id: r.get(13)?,
                    tag_ids: Vec::new(),
                    slip_ref: r.get(14)?,
                    slip_qr_raw: r.get(15)?,
                    slip_ocr_text: r.get(16)?,
                    slip_image_path: r.get(17)?,
                    created_at: r.get(18)?,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(row.map(|mut rec| {
        rec.tag_ids = fetch_tags_for_record(conn, &rec.id);
        rec
    }))
}

/// The occurrence after `date` for a rule with this frequency. Monthly and
/// yearly rules land on `anchor_day`, the rule's day of month, or on the last
/// day of a shorter month: a rule on the 31st posts on Feb 28, then on Mar 31.
pub fn next_occurrence(date: NaiveDate, frequency: &str, anchor_day: Option<i32>) -> NaiveDate {
    let (year, month) = match frequency {
        "weekly" => return date + Duration::days(7),
        "biweekly" => return date + Duration::days(14),
        "yearly" => (date.year() + 1, date.month()),
        _ if date.month() == 12 => (date.year() + 1, 1),
        _ => (date.year(), date.month() + 1),
    };
    let day = anchor_day.map_or(date.day(), |d| d.clamp(1, 31) as u32);
    (1..=day)
        .rev()
        .find_map(|d| NaiveDate::from_ymd_opt(year, month, d))
        .unwrap_or(NaiveDate::MAX)
}

/// How far back recurring catch-up reaches. Missed occurrences older than this (usually
/// a mistyped start date) are skipped, not posted.
pub const RECURRING_CATCH_UP_DAYS: i64 = 366;
/// Safety cap on the occurrences walked for one rule in one call.
const MAX_OCCURRENCE_STEPS: usize = 200_000;

/// The first occurrence on or after `from`, walking forward from `due`. Returns `None`
/// when the walk can't get there (corrupt rule data), so callers never loop forever.
pub fn first_occurrence_on_or_after(
    mut due: NaiveDate,
    from: NaiveDate,
    frequency: &str,
    anchor_day: Option<i32>,
) -> Option<NaiveDate> {
    let mut steps = 0;
    while due < from {
        let next = next_occurrence(due, frequency, anchor_day);
        steps += 1;
        if next <= due || steps > MAX_OCCURRENCE_STEPS {
            return None;
        }
        due = next;
    }
    Some(due)
}

struct DueRule {
    id: String,
    kind: String,
    amount_satang: i64,
    category_id: Option<String>,
    account_id: Option<String>,
    note: Option<String>,
    payee_raw: Option<String>,
    tag_ids: String,
    frequency: String,
    day_of_month: Option<i32>,
    next_run_date: String,
}

/// Posts a record for every occurrence of an active recurring rule dated on or
/// before `today`, catching up on missed runs, and moves each rule's
/// `next_run_date` past `today`. Everything happens in one transaction, so a
/// second call posts nothing new. Returns the number of records posted.
pub fn post_due_recurring(conn: &Connection, today: NaiveDate) -> Result<usize, String> {
    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("begin recurring posting: {e}"))?;
    let rules: Vec<DueRule> = {
        let mut stmt = tx
            .prepare(
                "SELECT id, kind, amount_satang, category_id, account_id, note, payee_raw, tag_ids,
                        frequency, day_of_month, next_run_date
                 FROM recurring_rules WHERE active = 1 AND next_run_date <= ?1",
            )
            .map_err(|e| e.to_string())?;
        stmt.query_map(params![today.format("%Y-%m-%d").to_string()], |r| {
            Ok(DueRule {
                id: r.get(0)?,
                kind: r.get(1)?,
                amount_satang: r.get(2)?,
                category_id: r.get(3)?,
                account_id: r.get(4)?,
                note: r.get(5)?,
                payee_raw: r.get(6)?,
                tag_ids: r.get(7)?,
                frequency: r.get(8)?,
                day_of_month: r.get(9)?,
                next_run_date: r.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<_, _>>()
        .map_err(|e| e.to_string())?
    };

    let now = Local::now().to_rfc3339();
    let horizon = today - Duration::days(RECURRING_CATCH_UP_DAYS);
    let mut posted = 0;
    for rule in rules {
        let Ok(next_run) = NaiveDate::parse_from_str(&rule.next_run_date, "%Y-%m-%d") else {
            continue;
        };
        let Some(mut due) =
            first_occurrence_on_or_after(next_run, horizon, &rule.frequency, rule.day_of_month)
        else {
            continue;
        };
        let tag_ids: Vec<String> = serde_json::from_str(&rule.tag_ids).unwrap_or_default();
        let payee_norm = rule.payee_raw.as_deref().map(normalize_payee);
        while due <= today {
            let id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO records (
                    id, kind, amount_satang, currency, local_date, local_time,
                    account_id, category_id, payee_raw, payee_normalized, note,
                    source, parse_status, is_reviewed, recurring_rule_id, created_at, updated_at
                 ) VALUES (?1, ?2, ?3, 'THB', ?4, NULL, ?5, ?6, ?7, ?8, ?9, 'recurring', 'ok', 1, ?10, ?11, ?11)",
                params![
                    id,
                    rule.kind,
                    rule.amount_satang,
                    due.format("%Y-%m-%d").to_string(),
                    rule.account_id,
                    rule.category_id,
                    rule.payee_raw,
                    payee_norm,
                    rule.note,
                    rule.id,
                    now
                ],
            )
            .map_err(|e| format!("post recurring record: {e}"))?;
            for tag_id in &tag_ids {
                let _ = tx.execute(
                    "INSERT OR IGNORE INTO record_tags (record_id, tag_id) VALUES (?1, ?2)",
                    params![id, tag_id],
                );
            }
            posted += 1;
            due = next_occurrence(due, &rule.frequency, rule.day_of_month);
        }
        tx.execute(
            "UPDATE recurring_rules SET next_run_date = ?2 WHERE id = ?1",
            params![rule.id, due.format("%Y-%m-%d").to_string()],
        )
        .map_err(|e| format!("advance recurring rule: {e}"))?;
    }
    tx.commit()
        .map_err(|e| format!("commit recurring posting: {e}"))?;
    Ok(posted)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_db() -> (Connection, std::path::PathBuf) {
        let path = std::env::temp_dir().join(format!("moojot-db-{}.sqlite3", Uuid::new_v4()));
        let conn = init_db(&path).expect("init db");
        (conn, path)
    }

    fn cleanup(path: &Path) {
        for suffix in ["", "-wal", "-shm"] {
            let mut file = path.as_os_str().to_os_string();
            file.push(suffix);
            let _ = std::fs::remove_file(file);
        }
    }

    fn ymd(s: &str) -> NaiveDate {
        NaiveDate::parse_from_str(s, "%Y-%m-%d").expect("valid date")
    }

    fn add_tag(conn: &Connection, name: &str) -> String {
        let id = format!("tag_{name}");
        conn.execute(
            "INSERT INTO tags (id, name, color, disabled, sort_order) VALUES (?1, ?2, '#3b82f6', 0, 50)",
            params![id, name],
        )
        .expect("insert tag");
        id
    }

    fn recurring_record(date: &str, frequency: &str, tag_ids: Vec<String>) -> RecordInput {
        RecordInput {
            id: None,
            kind: "spending".to_string(),
            amount_satang: 1_250_000,
            local_date: date.to_string(),
            local_time: None,
            account_id: Some("cash".to_string()),
            category_id: Some("cat_home".to_string()),
            payee_raw: Some("Test Landlord".to_string()),
            note: Some("rent".to_string()),
            tag_ids,
            recurring_frequency: Some(frequency.to_string()),
        }
    }

    fn posted_records(conn: &Connection, rule_id: &str) -> Vec<RecordItem> {
        let mut stmt = conn
            .prepare(
                "SELECT id FROM records
                 WHERE recurring_rule_id = ?1 AND source = 'recurring'
                 ORDER BY local_date",
            )
            .expect("prepare posted");
        let ids: Vec<String> = stmt
            .query_map(params![rule_id], |r| r.get(0))
            .expect("query posted")
            .collect::<Result<_, _>>()
            .expect("read posted");
        ids.iter()
            .map(|id| get_record_by_id(conn, id).expect("get").expect("exists"))
            .collect()
    }

    fn next_run(conn: &Connection, rule_id: &str) -> String {
        conn.query_row(
            "SELECT next_run_date FROM recurring_rules WHERE id = ?1",
            params![rule_id],
            |r| r.get(0),
        )
        .expect("rule exists")
    }

    fn chain(start: &str, frequency: &str, anchor_day: i32, steps: usize) -> Vec<String> {
        let mut date = ymd(start);
        (0..steps)
            .map(|_| {
                date = next_occurrence(date, frequency, Some(anchor_day));
                date.to_string()
            })
            .collect()
    }

    #[test]
    fn monthly_rule_keeps_its_day_of_month() {
        assert_eq!(
            chain("2026-01-31", "monthly", 31, 4),
            ["2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]
        );
        assert_eq!(
            chain("2028-01-30", "monthly", 30, 2),
            ["2028-02-29", "2028-03-30"]
        );
        assert_eq!(chain("2026-12-31", "monthly", 31, 1), ["2027-01-31"]);
        assert_eq!(
            chain("2026-01-15", "monthly", 15, 2),
            ["2026-02-15", "2026-03-15"]
        );
    }

    #[test]
    fn yearly_rule_on_feb_29_uses_feb_28_in_other_years() {
        assert_eq!(
            chain("2024-02-29", "yearly", 29, 4),
            ["2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"]
        );
    }

    #[test]
    fn weekly_and_biweekly_rules_step_by_days() {
        assert_eq!(
            chain("2026-01-28", "weekly", 28, 2),
            ["2026-02-04", "2026-02-11"]
        );
        assert_eq!(
            chain("2026-12-25", "biweekly", 25, 2),
            ["2027-01-08", "2027-01-22"]
        );
    }

    #[test]
    fn due_rule_posts_each_missed_occurrence_and_advances() {
        let (conn, path) = temp_db();
        let tag = add_tag(&conn, "bills");
        let source = upsert_record(
            &conn,
            &recurring_record("2026-01-31", "monthly", vec![tag.clone()]),
        )
        .expect("save source record");
        let rule_id = source.recurring_rule_id.clone().expect("rule created");

        let posted = post_due_recurring(&conn, ymd("2026-05-15")).expect("post due");

        let records = posted_records(&conn, &rule_id);
        let dates: Vec<&str> = records.iter().map(|r| r.local_date.as_str()).collect();
        assert_eq!(posted, 3);
        assert_eq!(dates, ["2026-02-28", "2026-03-31", "2026-04-30"]);
        for rec in &records {
            assert_eq!(rec.kind, "spending");
            assert_eq!(rec.amount_satang, 1_250_000);
            assert_eq!(rec.account_id.as_deref(), Some("cash"));
            assert_eq!(rec.category_id.as_deref(), Some("cat_home"));
            assert_eq!(rec.payee_raw.as_deref(), Some("Test Landlord"));
            assert_eq!(rec.note.as_deref(), Some("rent"));
            assert_eq!(rec.tag_ids, vec![tag.clone()]);
            assert_eq!(rec.parse_status, "ok");
            assert_ne!(rec.id, source.id);
        }
        assert_eq!(next_run(&conn, &rule_id), "2026-05-31");
        cleanup(&path);
    }

    #[test]
    fn posting_again_creates_no_duplicates() {
        let (conn, path) = temp_db();
        let source = upsert_record(&conn, &recurring_record("2026-03-10", "weekly", Vec::new()))
            .expect("save source record");
        let rule_id = source.recurring_rule_id.expect("rule created");

        assert_eq!(
            post_due_recurring(&conn, ymd("2026-04-01")).expect("first run"),
            3
        );
        assert_eq!(
            post_due_recurring(&conn, ymd("2026-04-01")).expect("second run"),
            0
        );
        assert_eq!(posted_records(&conn, &rule_id).len(), 3);
        assert_eq!(next_run(&conn, &rule_id), "2026-04-07");

        assert_eq!(
            post_due_recurring(&conn, ymd("2026-04-07")).expect("next week"),
            1
        );
        assert_eq!(posted_records(&conn, &rule_id).len(), 4);
        assert_eq!(next_run(&conn, &rule_id), "2026-04-14");
        cleanup(&path);
    }

    #[test]
    fn rules_not_yet_due_or_stopped_do_not_post() {
        let (conn, path) = temp_db();
        let future = upsert_record(
            &conn,
            &recurring_record("2026-06-01", "monthly", Vec::new()),
        )
        .expect("save future source");
        let stopped = upsert_record(
            &conn,
            &recurring_record("2026-01-01", "monthly", Vec::new()),
        )
        .expect("save stopped source");
        let stopped_rule = stopped.recurring_rule_id.expect("rule created");
        conn.execute(
            "UPDATE recurring_rules SET active = 0 WHERE id = ?1",
            params![stopped_rule],
        )
        .expect("stop rule");

        assert_eq!(
            post_due_recurring(&conn, ymd("2026-06-15")).expect("post due"),
            0
        );
        assert_eq!(
            next_run(&conn, &future.recurring_rule_id.expect("rule")),
            "2026-07-01"
        );
        assert_eq!(next_run(&conn, &stopped_rule), "2026-02-01");
        cleanup(&path);
    }

    #[test]
    fn deleting_the_source_record_keeps_the_series() {
        let (conn, path) = temp_db();
        let tag = add_tag(&conn, "home");
        let source = upsert_record(
            &conn,
            &recurring_record("2026-02-01", "monthly", vec![tag.clone()]),
        )
        .expect("save source record");
        let rule_id = source.recurring_rule_id.clone().expect("rule created");
        conn.execute("DELETE FROM records WHERE id = ?1", params![source.id])
            .expect("delete source record");

        assert_eq!(
            post_due_recurring(&conn, ymd("2026-03-01")).expect("post due"),
            1
        );
        let records = posted_records(&conn, &rule_id);
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].payee_raw.as_deref(), Some("Test Landlord"));
        assert_eq!(records[0].tag_ids, vec![tag]);
        cleanup(&path);
    }

    #[test]
    fn rules_from_older_databases_keep_their_payee_and_tags() {
        let (conn, path) = temp_db();
        let tag = add_tag(&conn, "rent");
        let source = upsert_record(
            &conn,
            &recurring_record("2026-02-01", "monthly", vec![tag.clone()]),
        )
        .expect("save source record");
        let rule_id = source.recurring_rule_id.clone().expect("rule created");
        let orphan = upsert_record(
            &conn,
            &recurring_record("2026-02-10", "monthly", Vec::new()),
        )
        .expect("save second source record");
        let orphan_rule = orphan.recurring_rule_id.clone().expect("rule created");
        conn.execute("DELETE FROM records WHERE id = ?1", params![orphan.id])
            .expect("delete second source record");
        // Make the rules look like ones saved before rules stored a payee and tags.
        conn.execute_batch(
            "ALTER TABLE recurring_rules DROP COLUMN payee_raw;
             ALTER TABLE recurring_rules DROP COLUMN tag_ids;",
        )
        .expect("drop new columns");
        drop(conn);

        let conn = init_db(&path).expect("reopen db");
        assert_eq!(
            post_due_recurring(&conn, ymd("2026-03-10")).expect("post due"),
            2
        );
        let records = posted_records(&conn, &rule_id);
        assert_eq!(records[0].payee_raw.as_deref(), Some("Test Landlord"));
        assert_eq!(records[0].tag_ids, vec![tag]);
        let orphan_records = posted_records(&conn, &orphan_rule);
        assert_eq!(orphan_records[0].payee_raw, None);
        assert!(orphan_records[0].tag_ids.is_empty());
        cleanup(&path);
    }

    #[test]
    fn typo_start_date_does_not_flood_the_ledger() {
        let (conn, path) = temp_db();
        // A weekly rule whose year was mistyped as 0026 instead of 2026.
        let source = upsert_record(&conn, &recurring_record("0026-03-01", "weekly", vec![]))
            .expect("save source record");
        let rule_id = source.recurring_rule_id.clone().expect("rule created");
        let today = ymd("2026-11-22");

        let posted = post_due_recurring(&conn, today).expect("post due");

        // At most one year of catch-up: 53 weekly occurrences, not ~104,000.
        assert!(posted <= 53, "posted {posted} records");
        let oldest = posted_records(&conn, &rule_id)
            .iter()
            .map(|r| r.local_date.clone())
            .min()
            .unwrap_or_default();
        assert!(oldest.as_str() >= "2025-11-21", "oldest posted {oldest}");
        assert!(next_run(&conn, &rule_id).as_str() > "2026-11-22");
        cleanup(&path);
    }
}

#[cfg(test)]
mod payee_rule_tests {
    use super::*;
    use crate::categorizer::{classify_local, upsert_user_rule};

    fn temp_db() -> (Connection, std::path::PathBuf) {
        let path = std::env::temp_dir().join(format!("moojot-db-{}.sqlite3", Uuid::new_v4()));
        (init_db(&path).expect("init db"), path)
    }

    fn cleanup(path: &Path) {
        let _ = std::fs::remove_file(path);
        for suffix in ["-wal", "-shm"] {
            let mut p = path.as_os_str().to_os_string();
            p.push(suffix);
            let _ = std::fs::remove_file(p);
        }
    }

    #[test]
    fn income_record_does_not_overwrite_a_spending_rule() {
        let (conn, path) = temp_db();
        // The user taught OpenJot that "Test Mart" is food.
        upsert_user_rule(&conn, "test mart", "cat_food").unwrap();

        // Later they get cashback from the same payee.
        upsert_record(
            &conn,
            &RecordInput {
                id: None,
                kind: "income".into(),
                amount_satang: 5_000,
                local_date: "2026-11-21".into(),
                local_time: None,
                account_id: None,
                category_id: Some("cat_cashback".into()),
                payee_raw: Some("Test Mart".into()),
                note: None,
                tag_ids: Vec::new(),
                recurring_frequency: None,
            },
        )
        .unwrap();

        // Spending at Test Mart is still food.
        assert_eq!(
            classify_local(&conn, Some("Test Mart"), None, None).as_deref(),
            Some("cat_food")
        );
        cleanup(&path);
    }
}

#[cfg(test)]
mod reminder_settings_tests {
    use super::*;

    #[test]
    fn reminder_is_off_at_eight_pm_by_default() {
        let s = AppSettings::default();
        assert!(!s.reminder_enabled);
        assert_eq!(s.reminder_time, "20:00");
    }

    #[test]
    fn a_frontend_without_reminder_fields_keeps_the_defaults() {
        let json = r#"{"language":"th","monthStartDay":25,"weekStartDay":1,"defaultView":"monthly",
            "allowSharedAlbum":false,"ownerNames":[],"aksonOcrApiKey":"","aksonOcrModel":"m",
            "englishOcrEngine":"mlkit_latin"}"#;
        let s: AppSettings = serde_json::from_str(json).expect("older settings still parse");
        assert!(!s.reminder_enabled);
        assert_eq!(s.reminder_time, "20:00");
    }

    #[test]
    fn reminder_time_must_be_a_real_time() {
        assert_eq!(valid_reminder_time("07:05").as_deref(), Some("07:05"));
        assert_eq!(valid_reminder_time("23:59").as_deref(), Some("23:59"));
        for bad in ["24:00", "12:60", "7:05", "07:5", "", "noon", "07-05", "-1:00", "07:05:00"] {
            assert_eq!(valid_reminder_time(bad), None, "{bad}");
        }
    }

    #[test]
    fn reminder_settings_round_trip_and_bad_times_fall_back() {
        let path = std::env::temp_dir().join(format!("moojot-reminder-{}.sqlite3", Uuid::new_v4()));
        let conn = init_db(&path).expect("init db");
        let mut s = load_settings(&conn).expect("load");
        s.reminder_enabled = true;
        s.reminder_time = "21:30".to_string();
        save_settings(&conn, &s).expect("save");
        let back = load_settings(&conn).expect("reload");
        assert!(back.reminder_enabled);
        assert_eq!(back.reminder_time, "21:30");

        s.reminder_time = "99:99".to_string();
        save_settings(&conn, &s).expect("save bad time");
        assert_eq!(load_settings(&conn).expect("reload").reminder_time, "20:00");

        drop(conn);
        for suffix in ["", "-wal", "-shm"] {
            let mut file = path.as_os_str().to_os_string();
            file.push(suffix);
            let _ = std::fs::remove_file(file);
        }
    }
}
