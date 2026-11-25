pub mod analytics;
pub mod banks;
pub mod categorizer;
pub mod commands;
pub mod db;
pub mod slip_parser;
pub mod statement;

use std::sync::Mutex;
use tauri::Manager;

use crate::db::{init_db, DbState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());
    // Fingerprint / phone-PIN app lock (#79). The plugin only exists on phones.
    #[cfg(mobile)]
    let builder = builder.plugin(tauri_plugin_biometric::init());
    builder
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("resolve app_data_dir: {e}"))?;
            let db_path = data_dir.join("moojot.sqlite3");
            let conn = init_db(&db_path)?;
            app.manage(DbState(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_home_data,
            commands::get_summary_data,
            commands::get_compare_data,
            commands::get_budgets,
            commands::upsert_budget,
            commands::delete_budget,
            commands::save_record,
            commands::delete_record,
            commands::delete_recurring_rule,
            commands::post_due_recurring_records,
            commands::search_records,
            commands::get_accounts,
            commands::toggle_account_enabled,
            commands::get_categories,
            commands::create_category,
            commands::delete_category,
            commands::get_tags,
            commands::create_tag,
            commands::toggle_tag_disabled,
            commands::get_settings,
            commands::update_settings,
            commands::get_album_scan_keywords,
            commands::list_known_slip_media_ids,
            commands::remember_scanned_media,
            commands::list_scanned_months,
            commands::remember_scanned_months,
            commands::import_slip_candidates,
            commands::reparse_all_slips,
            commands::get_backfill_targets,
            commands::apply_slip_backfill,
            commands::list_payee_rules,
            commands::upsert_payee_rule,
            commands::delete_payee_rule,
            commands::auto_categorize_uncategorized,
            commands::export_records_csv,
            commands::export_backup_json,
            commands::import_statement_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MooJot Tauri application");
}
