// "What's new" (#104): the changelog the app shows after an update, plus the pure rules for
// which releases to show. No Svelte, Tauri or i18n imports, so the unit tests can load it in
// plain Node. The changelog texts live here (not in i18n.ts) for the same reason.

export type WhatsNewLang = "en" | "th";
export type WhatsNewIcon = "lock" | "bell-ring" | "smartphone" | "mail" | "bell" | "sparkles";
export type WhatsNewAction = "app-lock" | "reminder" | "widget-help" | "feedback";

export interface WhatsNewItem {
  id: string;
  /** A lucide icon, picked to a component in the UI. */
  icon: WhatsNewIcon;
  title: Record<WhatsNewLang, string>;
  body: Record<WhatsNewLang, string>;
  action?: WhatsNewAction;
}

export interface WhatsNewRelease {
  version: string;
  /** YYYY-MM-DD */
  date: string;
  items: WhatsNewItem[];
}

/** Newest first. Add an entry for every release: a unit test fails when the newest one is older than package.json. */
export const CHANGELOG: WhatsNewRelease[] = [
  {
    version: "1.6.0",
    date: "2026-11-27",
    items: [
      {
        id: "trajectonomics-theme",
        icon: "sparkles",
        title: {
          en: "A new Trajectonomics theme",
          th: "ธีมใหม่ Trajectonomics",
        },
        body: {
          en: "A dark theme with the Trajectonomics robot. Pick it under Theme in My Moo. Pink & White and Black & Orange are still there.",
          th: "ธีมสีเข้มพร้อมหุ่นยนต์ของ Trajectonomics เลือกได้ที่ธีมในมูของฉัน ธีมชมพูขาวและดำส้มยังอยู่เหมือนเดิม",
        },
      },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-11-25",
    items: [
      {
        id: "rename",
        icon: "sparkles",
        title: {
          en: "MooJot is now OpenJot",
          th: "MooJot เปลี่ยนชื่อเป็น OpenJot แล้ว",
        },
        body: {
          en: "Same app and same Moo, now by Trajectonomics. Your records, settings and app lock stay exactly as they were.",
          th: "แอปเดิม มูตัวเดิม ตอนนี้โดย Trajectonomics รายการ การตั้งค่า และล็อกแอปของคุณยังอยู่ครบเหมือนเดิม",
        },
      },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-11-24",
    items: [
      {
        id: "news",
        icon: "bell",
        title: { en: "News stays on Home", th: "ข่าวอัปเดตอยู่บนหน้าหลัก" },
        body: {
          en: "The latest news waits on Home until you close it. Tap the bell in My Moo to read every update again.",
          th: "ข่าวล่าสุดจะอยู่บนหน้าหลักจนกว่าคุณจะปิด แตะกระดิ่งในมูของฉันเพื่ออ่านทุกอัปเดตได้อีกครั้ง",
        },
      },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-11-24",
    items: [
      {
        id: "app-lock",
        icon: "lock",
        action: "app-lock",
        title: { en: "Fingerprint app lock", th: "ล็อกแอปด้วยลายนิ้วมือ" },
        body: {
          en: "Keep your records private. It's off unless you turn it on.",
          th: "เก็บข้อมูลให้เป็นส่วนตัว ปิดไว้จนกว่าคุณจะเปิดเอง",
        },
      },
      {
        id: "reminder",
        icon: "bell-ring",
        action: "reminder",
        title: { en: "Daily reminder", th: "เตือนให้จดทุกวัน" },
        body: {
          en: "A nudge at a time you choose, skipped on days you already jotted.",
          th: "เตือนตามเวลาที่คุณเลือก และข้ามวันที่คุณจดแล้ว",
        },
      },
      {
        id: "widget",
        icon: "smartphone",
        action: "widget-help",
        title: { en: "Home-screen widget", th: "วิดเจ็ตหน้าจอหลัก" },
        body: {
          en: "See today's spending, with Scan and + buttons.",
          th: "ดูรายจ่ายวันนี้ พร้อมปุ่มสแกนและปุ่ม +",
        },
      },
      {
        id: "feedback",
        icon: "mail",
        action: "feedback",
        title: { en: "Send feedback", th: "ส่งความคิดเห็น" },
        body: {
          en: "Tell us what to fix or build next.",
          th: "บอกเราได้ว่าควรแก้หรือทำอะไรต่อ",
        },
      },
    ],
  },
];

/** Numeric parts of "1.10.0"; a missing or non-numeric part counts as 0 and a "-beta" suffix is ignored. */
function versionParts(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, "")
    .split(/[-+]/)[0]
    .split(".")
    .map((part) => {
      const n = Number.parseInt(part, 10);
      return Number.isFinite(n) ? n : 0;
    });
}

/** Negative when a is older than b, 0 when equal, positive when newer. 1.10.0 is newer than 1.9.0. */
export function compareVersions(a: string, b: string): number {
  const left = versionParts(a);
  const right = versionParts(b);
  const length = Math.max(left.length, right.length, 3);
  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * The releases to show after an update: newer than `lastSeen`, and not newer than `current`.
 * With nothing recorded yet, the install is from before 1.3.0, when these notes started, so
 * every release up to `current` is new to it (an update from 1.2.x to 1.4.0 shows 1.4.0 and 1.3.0).
 * A brand-new install sees nothing: there is nothing "new" to it.
 */
export function releasesToShow(input: {
  lastSeen: string | null;
  current: string;
  freshInstall: boolean;
  releases?: WhatsNewRelease[];
}): WhatsNewRelease[] {
  const { lastSeen, current, freshInstall, releases = CHANGELOG } = input;
  if (freshInstall) return [];
  if (lastSeen === null) {
    return releases.filter((release) => compareVersions(release.version, current) <= 0);
  }
  return releases.filter(
    (release) =>
      compareVersions(release.version, lastSeen) > 0 && compareVersions(release.version, current) <= 0,
  );
}

/** The newest release that is not newer than the installed version, or null when there is none. */
export function latestRelease(current: string, releases: WhatsNewRelease[] = CHANGELOG): WhatsNewRelease | null {
  return releases.find((release) => compareVersions(release.version, current) <= 0) ?? null;
}

/**
 * The releases the Home banner announces, newest first: every one up to the installed version
 * that is newer than the version whose banner the person closed (all of them when they never
 * closed one, as after an update from 1.2.x). Empty means no banner. Opening the notes or
 * turning a feature on does not hide it, so they can come back to it; a newer release brings
 * it back.
 */
export function bannerReleases(input: {
  current: string | null;
  hiddenFor: string | null;
  releases?: WhatsNewRelease[];
}): WhatsNewRelease[] {
  const { current, hiddenFor, releases = CHANGELOG } = input;
  if (current === null) return [];
  return releases.filter(
    (release) =>
      compareVersions(release.version, current) <= 0 &&
      (hiddenFor === null || compareVersions(release.version, hiddenFor) > 0),
  );
}

// ---- Remembering the last version the person has seen ----

const KEY = "moojot_whats_new_seen";

/** The version whose notes were last shown or opened, or null when none was recorded. */
export function loadWhatsNewSeen(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw && /^\d+(\.\d+)*/.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveWhatsNewSeen(version: string): void {
  try {
    window.localStorage.setItem(KEY, version);
  } catch {
    // ignore storage restrictions
  }
}

// ---- Remembering the release whose Home banner was closed ----

const BANNER_KEY = "moojot_whats_new_banner_hidden";

/** The version whose Home banner the person closed, or null when they have not closed one. */
export function loadBannerHidden(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BANNER_KEY);
    return raw && /^\d+(\.\d+)*/.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveBannerHidden(version: string): void {
  try {
    window.localStorage.setItem(BANNER_KEY, version);
  } catch {
    // ignore storage restrictions
  }
}
