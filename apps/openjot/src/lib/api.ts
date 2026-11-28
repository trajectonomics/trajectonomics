import { invoke } from "@tauri-apps/api/core";
import type {
  Account,
  AppSettings,
  BudgetItem,
  Category,
  ComparePayload,
  HomePayload,
  RecordInput,
  RecordItem,
  SlipScanCandidate,
  SlipScanReport,
  SummaryPayload,
  Tag,
} from "./types";

declare global {
  interface Window {
    __moojotHandleBack?: () => string;
    MooJotAndroid?: {
      isAndroidNative(): boolean;
      setStatusBarLight?(light: boolean): void;
      hasGalleryPermission(): boolean;
      requestGalleryPermission(): void;
      scanBankSlips(
        keywordsJson: string,
        includeShared: boolean,
        sinceSec: number,
        skipIdsJson: string
      ): void;
      pickSlipPhoto(includeBase64: boolean): void;
      backfillExistingSlips(itemsJson: string): void;
      readSlipImageDataUrl(relativePath: string): string | null;
      shareTextFile(filename: string, mimeType: string, content: string): boolean;
      pickStatementPdf(): void;
      /** Android 13+: leave the app's screen out of the Recents thumbnail (app lock, #79). */
      setRecentsHidden?(hidden: boolean): void;
      // Daily reminder (#80), see DailyReminder.kt
      hasNotificationPermission?(): boolean;
      /** Answers with the moojot:notification-permission event: { granted }. */
      requestNotificationPermission?(): void;
      configureReminder?(enabled: boolean, hour: number, minute: number, title: string, body: string): void;
      /** Something was recorded on this local date (YYYY-MM-DD): no reminder that day. */
      markJotted?(localDate: string): void;
      // Home-screen widget (#81), see MooWidget.kt
      /** Stores the widget snapshot ($lib/widget) and redraws the widgets. */
      updateWidget?(snapshotJson: string): void;
      /** The widget button that opened the app, once: "add", "scan" or "". */
      takeWidgetAction?(): string;
      // The mascot setting and the launcher icon it switches, see MascotIcon.kt
      /** Stores "robot" or "moo" and redraws the widget; the launcher icon follows on leaving. */
      setMascot?(mascot: string): void;
    };
  }
}

export interface ImportStatementReport {
  issuer: string | null;
  imported: number;
  duplicates: number;
  skipped: number;
  needsPassword: boolean;
  wrongPassword: boolean;
  message: string | null;
}

export const api = {
  getHomeData: (periodOffset: number, accountIds?: string[]) =>
    invoke<HomePayload>("get_home_data", {
      periodOffset,
      accountIds: accountIds && accountIds.length > 0 ? accountIds : null,
    }),

  getSummaryData: (periodOffset: number, kind: string, accountIds?: string[]) =>
    invoke<SummaryPayload>("get_summary_data", {
      periodOffset,
      kind,
      accountIds: accountIds && accountIds.length > 0 ? accountIds : null,
    }),

  getCompareData: (periodOffset: number, kind: string, months = 6, accountIds?: string[]) =>
    invoke<ComparePayload>("get_compare_data", {
      periodOffset,
      kind,
      months,
      accountIds: accountIds && accountIds.length > 0 ? accountIds : null,
    }),

  getBudgets: (periodOffset: number, accountIds?: string[]) =>
    invoke<BudgetItem[]>("get_budgets", {
      periodOffset,
      accountIds: accountIds && accountIds.length > 0 ? accountIds : null,
    }),

  upsertBudget: (input: {
    id?: string;
    scopeType: string;
    scopeId: string | null;
    periodType: string;
    limitSatang: number;
    alertThresholdPct: number;
  }) => invoke<string>("upsert_budget", { input }),

  deleteBudget: (id: string) => invoke<void>("delete_budget", { id }),

  saveRecord: (input: RecordInput) => invoke<RecordItem>("save_record", { input }),

  deleteRecord: (id: string) => invoke<void>("delete_record", { id }),

  deleteRecurringRule: (ruleId: string) =>
    invoke<void>("delete_recurring_rule", { ruleId }),

  postDueRecurringRecords: () => invoke<number>("post_due_recurring_records"),

  searchRecords: (query: string) => invoke<RecordItem[]>("search_records", { query }),

  getAccounts: () => invoke<Account[]>("get_accounts"),

  toggleAccountEnabled: (id: string, enabled: boolean) =>
    invoke<void>("toggle_account_enabled", { id, enabled }),

  getCategories: () => invoke<Category[]>("get_categories"),

  createCategory: (input: {
    nameEn: string;
    nameTh: string;
    kind: "spending" | "income";
    icon: string;
    color: string;
  }) => invoke<Category>("create_category", { input }),

  deleteCategory: (id: string) => invoke<void>("delete_category", { id }),

  getTags: () => invoke<Tag[]>("get_tags"),

  createTag: (name: string, color?: string) =>
    invoke<Tag>("create_tag", { name, color: color ?? null }),

  toggleTagDisabled: (id: string, disabled: boolean) =>
    invoke<void>("toggle_tag_disabled", { id, disabled }),

  getSettings: () => invoke<AppSettings>("get_settings"),

  updateSettings: (settings: AppSettings) =>
    invoke<void>("update_settings", { settings }),

  getAlbumScanKeywords: () => invoke<string[]>("get_album_scan_keywords"),

  listKnownSlipMediaIds: () => invoke<string[]>("list_known_slip_media_ids"),

  rememberScannedMedia: (ids: string[]) =>
    invoke<void>("remember_scanned_media", { ids }),

  listScannedMonths: () => invoke<string[]>("list_scanned_months"),

  rememberScannedMonths: (months: string[]) =>
    invoke<void>("remember_scanned_months", { months }),

  importSlipCandidates: (candidates: SlipScanCandidate[]) =>
    invoke<SlipScanReport>("import_slip_candidates", { candidates }),

  reparseAllSlips: () =>
    invoke<{ updated: number; removedNonSlips: number; transfersDetected: number }>(
      "reparse_all_slips"
    ),

  getBackfillTargets: () =>
    invoke<{ mediaStoreId: string; contentSha256: string; needsThaiOcr: boolean }[]>(
      "get_backfill_targets"
    ),

  applySlipBackfill: (
    items: { contentSha256: string; imagePath: string | null; ocrText: string | null }[]
  ) => invoke<number>("apply_slip_backfill", { items }),

  listPayeeRules: () =>
    invoke<{ id: string; pattern: string; categoryId: string; hitCount: number; isBuiltin: boolean }[]>(
      "list_payee_rules"
    ),

  upsertPayeeRule: (pattern: string, categoryId: string) =>
    invoke<{ id: string; pattern: string; categoryId: string; hitCount: number; isBuiltin: boolean }>(
      "upsert_payee_rule",
      { pattern, categoryId }
    ),

  deletePayeeRule: (id: string) => invoke<void>("delete_payee_rule", { id }),

  autoCategorizeUncategorized: () =>
    invoke<number>("auto_categorize_uncategorized"),

  exportRecordsCsv: () => invoke<string>("export_records_csv"),

  exportBackupJson: () => invoke<string>("export_backup_json"),

  importStatementPdf: (pdfBase64: string, password?: string | null) =>
    invoke<ImportStatementReport>("import_statement_pdf", {
      input: {
        pdfBase64,
        password: password && password.length > 0 ? password : null,
      },
    }),
};

export function hasAndroidBridge(): boolean {
  return typeof window !== "undefined" && Boolean(window.MooJotAndroid?.isAndroidNative());
}

export function triggerAndroidDownloadOrShare(
  filename: string,
  mimeType: string,
  content: string
): boolean {
  if (typeof window !== "undefined" && window.MooJotAndroid) {
    return window.MooJotAndroid.shareTextFile(filename, mimeType, content);
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
