// Shared domain types for the MooJot frontend.
// These mirror the Rust Tauri IPC JSON models, which are serialized in
// camelCase via `#[serde(rename_all = "camelCase")]`.

export type RecordKind = "spending" | "income" | "transfer";

export type RecordSource =
  | "manual"
  | "slip_auto"
  | "slip_share"
  | "pdf_statement"
  | "recurring";

export type ParseStatus = "ok" | "needs_review" | "failed";

export type PeriodView = "monthly" | "biweekly" | "weekly";

export interface Account {
  id: string;
  nameEn: string;
  nameTh: string;
  kind: "bank" | "wallet" | "card" | "cash";
  bankCode: string | null;
  color: string;
  usesSharedAlbum: boolean;
  enabled: boolean;
}

export interface Category {
  id: string;
  nameEn: string;
  nameTh: string;
  kind: "spending" | "income";
  icon: string;
  color: string;
  isSystem: boolean;
  sortOrder: number;
  archived: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  disabled: boolean;
  sortOrder: number;
}

export interface RecordItem {
  id: string;
  kind: RecordKind;
  amountSatang: number;
  currency: string;
  localDate: string;
  localTime: string | null;
  accountId: string | null;
  categoryId: string | null;
  payeeRaw: string | null;
  note: string | null;
  source: RecordSource;
  parseStatus: ParseStatus;
  isReviewed: boolean;
  recurringRuleId: string | null;
  tagIds: string[];
  slipRef: string | null;
  slipQrRaw: string | null;
  slipOcrText: string | null;
  slipImagePath?: string | null;
  createdAt: string;
}

export interface PayeeRule {
  id: string;
  pattern: string;
  categoryId: string;
  hitCount: number;
  isBuiltin: boolean;
}

export interface DayGroup {
  localDate: string;
  dayOfWeek: string;
  dayNumber: number;
  spendingSatang: number;
  incomeSatang: number;
  transferCount: number;
  records: RecordItem[];
}

export interface FutureRecordItem {
  ruleId: string;
  kind: RecordKind;
  amountSatang: number;
  dueDate: string;
  categoryId: string | null;
  note: string | null;
  frequency: string;
  dayOfMonth: number | null;
}

export interface PeriodRange {
  startDate: string;
  endDate: string;
  label: string;
}

export interface HomePayload {
  period: PeriodRange;
  totalSpendingSatang: number;
  totalIncomeSatang: number;
  totalTransferSatang: number;
  remainingSatang: number;
  dayGroups: DayGroup[];
  futureRecords: FutureRecordItem[];
  futureTotalSatang: number;
  needsReviewCount: number;
  todayJottedCount: number;
  syncStreakDays: number;
  categorizeStreakDays: number;
  bestStreakDays: number;
}

export interface CategoryBreakdown {
  categoryId: string | null;
  nameEn: string;
  nameTh: string;
  icon: string;
  color: string;
  amountSatang: number;
  count: number;
  percentage: number;
}

export interface TagBreakdown {
  tagId: string;
  name: string;
  color: string;
  amountSatang: number;
  count: number;
  percentage: number;
}

export interface SummaryPayload {
  period: PeriodRange;
  incomeSatang: number;
  spendingSatang: number;
  transferSatang: number;
  remainingSatang: number;
  byCategory: CategoryBreakdown[];
  byTag: TagBreakdown[];
}

export interface TrendBar {
  label: string;
  startDate: string;
  endDate: string;
  amountSatang: number;
  isCurrent: boolean;
}

export interface ComparePayload {
  bars: TrendBar[];
  averageSatang: number;
  currentSatang: number;
  deltaVsAverageSatang: number;
}

export interface BudgetItem {
  id: string;
  scopeType: "total" | "category" | "tag";
  scopeId: string | null;
  scopeLabel: string;
  scopeIcon: string | null;
  scopeColor: string;
  periodType: "monthly" | "weekly";
  limitSatang: number;
  spentSatang: number;
  remainingSatang: number;
  spentPct: number;
  todayPacePct: number;
  avgDailySpentSatang: number;
  avgDailyRemainingSatang: number;
  daysRemaining: number;
  alertThresholdPct: number;
}

export interface AppSettings {
  language: "en" | "th";
  monthStartDay: number;
  weekStartDay: number;
  defaultView: PeriodView;
  allowSharedAlbum: boolean;
  ownerNames: string[];
  aksonOcrApiKey: string;
  aksonOcrModel: string;
  englishOcrEngine: "mlkit_latin" | "akson_only";
  /** Opt-in fingerprint / phone-PIN lock (#79). Saved on its own, see changeAppLock. */
  appLockEnabled: boolean;
  /** Opt-in daily reminder (#80). */
  reminderEnabled: boolean;
  /** Local time of day, "HH:MM". */
  reminderTime: string;
}

export interface RecordInput {
  id?: string;
  kind: RecordKind;
  amountSatang: number;
  localDate: string;
  localTime?: string | null;
  accountId?: string | null;
  categoryId?: string | null;
  payeeRaw?: string | null;
  note?: string | null;
  tagIds: string[];
  recurringFrequency?: string | null;
}

export interface SlipScanCandidate {
  mediaStoreId: string;
  contentSha256: string;
  albumName: string;
  qrRaw: string | null;
  ocrText: string;
  imagePath?: string | null;
  imageBase64?: string | null;
  mimeType?: string | null;
  dateAddedSec: number;
}

export interface SlipScanReport {
  scanned: number;
  imported: number;
  duplicates: number;
  skippedNonSlip: number;
  needsReview: number;
  aksonCalls: number;
}
