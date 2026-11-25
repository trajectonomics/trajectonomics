<script lang="ts">
  import {
    Home,
    PieChart,
    User,
    Search,
    Wallet,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Plus,
    ScanLine,
    ImagePlus,
    X,
    Repeat,
    PenLine,
    Mail,
    Gift,
  } from "@lucide/svelte";
  import { tick, untrack } from "svelte";
  import CategoryIcon from "$lib/components/CategoryIcon.svelte";
  import EmptyMonthArt from "$lib/components/EmptyMonthArt.svelte";
  import MooMascot, { type MascotMood } from "$lib/components/MooMascot.svelte";
  import SwipeRecordRow from "$lib/components/SwipeRecordRow.svelte";
  import RecordSheet from "$lib/components/RecordSheet.svelte";
  import SummaryView from "$lib/components/SummaryView.svelte";
  import SettingsView, { type SettingsSubPage } from "$lib/components/SettingsView.svelte";
  import RulesModal from "$lib/components/RulesModal.svelte";
  import ThumbSheet from "$lib/components/ThumbSheet.svelte";
  import Onboarding from "$lib/components/Onboarding.svelte";
  import WhatsNewItems from "$lib/components/WhatsNewItems.svelte";
  import LockScreen from "$lib/components/LockScreen.svelte";
  import { lockOnReturn, requestUnlock } from "$lib/appLock";
  import {
    analyticsEnabled,
    setAnalyticsContext,
    setAnalyticsEnabled,
    startAnalytics,
    track,
    trackScreen,
  } from "$lib/analytics";
  import {
    deviceLanguage,
    FIRST_SCAN_MONTHS,
    markOnboardingDone,
    markOnboardingPending,
    onboardingState,
  } from "$lib/onboarding";
  import {
    api,
    hasAndroidBridge,
    triggerAndroidDownloadOrShare,
  } from "$lib/api";
  import { formatBaht } from "$lib/format";
  import { localDateKey, reminderConfig } from "$lib/reminder";
  import {
    loadFeedbackCard,
    saveFeedbackCard,
    shouldShowFeedbackCard,
    type FeedbackCardState,
  } from "$lib/feedback";
  import { openFeedbackMail } from "$lib/feedbackClient";
  import {
    bannerReleases,
    loadBannerHidden,
    loadWhatsNewSeen,
    saveBannerHidden,
    releasesToShow,
    saveWhatsNewSeen,
    type WhatsNewAction,
    type WhatsNewRelease,
  } from "$lib/whatsNew";
  import { getVersion } from "@tauri-apps/api/app";
  import { parseWidgetAction, widgetSnapshot, type WidgetAction } from "$lib/widget";
  import { monthPickerOffsets } from "$lib/monthPicker";
  import {
    clampMonthStartDay,
    monthPeriod,
    periodForKey,
    periodKeysSince,
    periodRangeLabel,
    type MonthPeriod,
  } from "$lib/period";
  import { t } from "$lib/i18n";
  import { omitFromCompare, omitFromSummary, omitRecord } from "$lib/ledgerPatch";
  import { loadSavedHand, loadSavedTheme, saveHand, saveTheme, type AppTheme, type HandMode } from "$lib/theme";
  import { activeTheme } from "$lib/themeStore";
  import type {
    Account,
    AppSettings,
    BudgetItem,
    Category,
    ComparePayload,
    HomePayload,
    PayeeRule,
    RecordInput,
    RecordItem,
    RecordKind,
    SlipScanCandidate,
    SlipScanReport,
    SummaryPayload,
    Tag,
  } from "$lib/types";

  // Read before the theme effect saves its keys: see onboardingState().
  const firstRunState = onboardingState();
  let showOnboarding = $state(false);
  let onboardingReplay = $state(false);
  let onboardingLanguage = $state<"en" | "th">("en");

  // Anonymous usage stats are opt-in (see $lib/analytics): nothing loads or sends until the
  // user turns them on in the welcome tour or in My Moo.
  let shareStats = $state(analyticsEnabled());
  void startAnalytics();
  track("app_opened", { first_run: firstRunState === "new" });

  function changeShareStats(on: boolean, where: "onboarding" | "settings") {
    shareStats = on;
    setAnalyticsEnabled(on, where);
  }
  let onboardingBack = $state<(() => void) | null>(null);

  // "What's new" after an update (#104). A brand-new install (or one still in the welcome tour)
  // has nothing new to read, so it only records the version it started on.
  const whatsNewFreshInstall = firstRunState === "new" || firstRunState === "pending";
  let appVersion = $state<string | null>(null);
  let whatsNewSeen = $state<string | null>(loadWhatsNewSeen());
  // The releases to show on this launch, fixed once the app version is known (null until then).
  let whatsNewLaunch = $state<WhatsNewRelease[] | null>(null);
  let showWhatsNew = $state(false);
  let whatsNewOpened = false;
  const whatsNewSheet = { current: null as (() => void) | null };

  const whatsNewUnseen = $derived(
    appVersion !== null &&
      releasesToShow({ lastSeen: whatsNewSeen, current: appVersion, freshInstall: false }).length > 0,
  );

  function markWhatsNewSeen() {
    if (appVersion === null) return;
    whatsNewSeen = appVersion;
    saveWhatsNewSeen(appVersion);
  }

  // The banner under the hero that keeps the latest release's news on Home until it is closed,
  // so someone who tapped "Turn on" in the sheet can come back to the rest.
  let whatsNewBannerHidden = $state<string | null>(loadBannerHidden());
  // Newest first; it can span several releases (an update from 1.2.x shows 1.4.0 and 1.3.0).
  const whatsNewBanner = $derived(
    showOnboarding ? [] : bannerReleases({ current: appVersion, hiddenFor: whatsNewBannerHidden }),
  );

  function hideWhatsNewBanner(version: string) {
    whatsNewBannerHidden = version;
    saveBannerHidden(version);
  }

  function openWhatsNewPage() {
    activeTab = "settings";
    settingsSubPage = "whatsnew";
  }

  $effect(() => {
    void (async () => {
      let version: string | null = null;
      try {
        version = await getVersion();
      } catch {
        // A plain browser or dev build has no app version: nothing to announce.
      }
      appVersion = version;
      whatsNewLaunch = version
        ? releasesToShow({ lastSeen: whatsNewSeen, current: version, freshInstall: whatsNewFreshInstall })
        : [];
      // A fresh install starts "up to date", with no news banner for the release it came with.
      if (version && whatsNewFreshInstall && whatsNewSeen === null) {
        markWhatsNewSeen();
        if (whatsNewBannerHidden === null) hideWhatsNewBanner(version);
      }
    })();
  });

  // Open the sheet once everything above it is out of the way: no tour, no lock card.
  $effect(() => {
    if (whatsNewOpened || !whatsNewLaunch?.length || showOnboarding || lockState !== "open") return;
    whatsNewOpened = true;
    showWhatsNew = true;
  });

  function closeWhatsNew() {
    showWhatsNew = false;
    markWhatsNewSeen();
  }

  /** The My Moo rows a "Turn on" button points at (ids set in SettingsView). */
  const WHATS_NEW_ROW_IDS = { "app-lock": "settings-row-app-lock", reminder: "settings-row-reminder" } as const;

  async function whatsNewAction(action: Exclude<WhatsNewAction, "widget-help">) {
    if (action === "feedback") {
      await sendFeedbackFromCard();
      return;
    }
    closeWhatsNew();
    activeTab = "settings";
    settingsSubPage = null;
    await tick();
    // SettingsView scrolls to the top as it mounts; wait for that before scrolling to the row.
    setTimeout(() => {
      const row = document.getElementById(WHATS_NEW_ROW_IDS[action]);
      if (!row) return;
      row.scrollIntoView({ block: "center", behavior: "smooth" });
      row.classList.add("moo-row-flash");
      setTimeout(() => row.classList.remove("moo-row-flash"), 1900);
    }, 80);
  }

  // One-time "send feedback" card under the hero (#90). It shows after 2 successful slip scans
  // or on the 3rd day of use, never during onboarding, and never again once used or closed.
  let feedbackCard = $state<FeedbackCardState>(loadFeedbackCard(localDateKey(new Date())));
  // The card waits for a later launch when "What's new" shows on this one (#104), and until we
  // know whether it will (the app version is read a moment after launch).
  // It also waits while the news banner is up, so Home shows one card at a time.
  const showFeedbackCard = $derived(
    !showOnboarding &&
      whatsNewLaunch !== null &&
      whatsNewLaunch.length === 0 &&
      whatsNewBanner.length === 0 &&
      shouldShowFeedbackCard(feedbackCard, localDateKey(new Date())),
  );

  function updateFeedbackCard(patch: Partial<FeedbackCardState>) {
    feedbackCard = { ...feedbackCard, ...patch };
    saveFeedbackCard(feedbackCard);
  }

  /** A gallery scan or a picked slip photo that finished without an error. PDF imports don't count. */
  function noteSuccessfulScan() {
    updateFeedbackCard({ successfulScans: feedbackCard.successfulScans + 1 });
  }

  async function sendFeedbackFromCard() {
    updateFeedbackCard({ used: true });
    const result = await openFeedbackMail(lang);
    if (result === "copied") {
      scanBanner = t(lang, "feedbackNoEmailApp");
      setTimeout(() => (scanBanner = null), 4500);
    }
  }
  let theme = $state<AppTheme>(loadSavedTheme());
  let hand = $state<HandMode>(loadSavedHand());
  let activeTab = $state<"home" | "summary" | "settings">("home");
  let settingsSubPage = $state<SettingsSubPage>(null);
  let periodOffset = $state<number>(0);
  let summaryKind = $state<RecordKind>("spending");
  let filterAccountIds = $state<string[]>([]);

  let settings = $state<AppSettings>({
    language: "en",
    monthStartDay: 1,
    weekStartDay: 0,
    defaultView: "monthly",
    allowSharedAlbum: false,
    ownerNames: [],
    aksonOcrApiKey: "",
    aksonOcrModel: "AksonOCR-preview",
    englishOcrEngine: "mlkit_latin",
    appLockEnabled: false,
    reminderEnabled: false,
    reminderTime: "20:00",
  });
  // The saved settings have been read once (the reminder sync waits for this).
  let settingsReady = $state(false);

  // Opt-in app lock (#79), see $lib/appLock. On Android the app starts "checking" (a plain cover)
  // until the saved setting is read, so records never show before the prompt.
  //   checking: setting not read yet  · open: no cover  · away: in the background, covered
  //   locked: the lock card, waiting for the fingerprint or phone PIN
  let lockState = $state<"checking" | "open" | "away" | "locked">(hasAndroidBridge() ? "checking" : "open");
  let unlocking = $state(false);
  let lockMessage = $state<string | null>(null);
  let hiddenAt: number | null = null;
  let accounts = $state<Account[]>([]);
  let categories = $state<Category[]>([]);
  let tags = $state<Tag[]>([]);
  let home = $state<HomePayload | null>(null);
  let summary = $state<SummaryPayload | null>(null);
  let compare = $state<ComparePayload | null>(null);
  let budgets = $state<BudgetItem[]>([]);

  let futureExpanded = $state<boolean>(false);
  let showFabMenu = $state<boolean>(false);
  let showRecordSheet = $state<boolean>(false);
  let recordLightboxOpen = $state<boolean>(false);
  let editingRecord = $state<RecordItem | null>(null);
  let showFilterSheet = $state<boolean>(false);
  let showRulesModal = $state<boolean>(false);
  let payeeRules = $state<PayeeRule[]>([]);
  let showSearch = $state<boolean>(false);
  let searchQuery = $state<string>("");
  let searchResults = $state<RecordItem[]>([]);

  let isScanning = $state<boolean>(false);
  let scanBanner = $state<string | null>(null);
  let stickyVisible = $state(false);
  let heroEl = $state<HTMLDivElement | null>(null);
  let openSwipeId = $state<string | null>(null);
  let pdfPrompt = $state<{ pdfBase64: string; wrong: boolean } | null>(null);
  let pdfPassword = $state("");
  let pdfBusy = $state(false);
  let scanStartPrompt = $state(false);
  let monthPicker = $state(false);
  let scannedMonths = $state<string[]>([]);
  let scanSinceSec = 0;
  let scanTotals = { imported: 0, duplicates: 0 };
  let scanTrigger: "album" | "photo" = "album";
  const monthSheet = { current: null as (() => void) | null };
  const filterSheet = { current: null as (() => void) | null };
  const scanSheet = { current: null as (() => void) | null };
  let undoDelete = $state<{
    recordId: string;
    home: HomePayload;
    summary: SummaryPayload | null;
    compare: ComparePayload | null;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  let deleteChain: Promise<void> = Promise.resolve();
  let scanChain: Promise<void> = Promise.resolve();
  let scanChainFailed = false;

  // Interactive Mascot state
  let mascotMood = $state<MascotMood>("idle");
  let mascotSpeech = $state<string | null>(null);
  let mascotTimer: ReturnType<typeof setTimeout> | null = null;
  let tapCount = $state<number>(0);

  // Pull-to-refresh & hold state on Home
  let pullStartY = $state<number | null>(null);
  let pullDistance = $state<number>(0);
  let pullArmed = $state<boolean>(false);
  const PULL_THRESHOLD = 68;

  const lang = $derived(settings.language);
  const anyModalOpen = $derived(
    showRecordSheet ||
    showRulesModal ||
    showSearch ||
    showFilterSheet ||
    pdfPrompt !== null ||
    scanStartPrompt ||
    monthPicker ||
    showOnboarding ||
    showWhatsNew ||
    lockState !== "open"
  );

  // Apply theme attribute & sync Android status bar icon contrast cleanly per screen!
  $effect(() => {
    saveTheme(theme);
    activeTheme.set(theme);
    saveHand(hand);
    const hasColoredTopBar =
      activeTab === "summary" ||
      activeTab === "settings" ||
      showRecordSheet ||
      showRulesModal ||
      showSearch ||
      recordLightboxOpen;
    const isLightStatusBar =
      theme === "pink-white" &&
      (lockState !== "open" || showOnboarding || (!hasColoredTopBar && activeTab !== "home"));
    window.MooJotAndroid?.setStatusBarLight?.(isLightStatusBar);
  });

  $effect(() => {
    setAnalyticsContext({ ui_language: lang, theme });
  });

  // One screen view per tab or My Moo page. The welcome tour tracks its own steps.
  $effect(() => {
    if (showOnboarding) return;
    trackScreen(activeTab === "settings" && settingsSubPage ? `settings/${settingsSubPage}` : activeTab);
  });

  // Pin the compact header once the monthly hero has left the viewport.
  // At scrollY === 0 the hero is on screen, so pull-to-refresh keeps the top.
  $effect(() => {
    if (activeTab !== "home") {
      stickyVisible = false;
      return;
    }
    const el = heroEl;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        stickyVisible = !!entry && !entry.isIntersecting && window.scrollY > 8;
      },
      { threshold: 0 }
    );
    observer.observe(el);
    const onScroll = () => {
      if (window.scrollY <= 2) stickyVisible = false;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  });

  $effect(() => {
    const el = homeMain;
    if (!el) return;
    const move = (event: TouchEvent) => onHomeTouchMove(event);
    el.addEventListener("touchmove", move, { passive: false });
    return () => el.removeEventListener("touchmove", move);
  });

  async function goToPeriod(offset: number) {
    monthPicker = false;
    if (offset === periodOffset) return;
    periodOffset = offset;
    stickyVisible = false;
    monthDrag = 0;
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    const request = ++periodRequest;
    const [h, sum, cmp, bdgs] = await Promise.all([
      api.getHomeData(offset, filterAccountIds),
      api.getSummaryData(offset, summaryKind, filterAccountIds),
      api.getCompareData(offset, summaryKind, 6, filterAccountIds),
      api.getBudgets(offset, filterAccountIds),
    ]);
    if (request !== periodRequest) return;
    home = h;
    summary = sum;
    compare = cmp;
    budgets = bdgs;
  }

  function changePeriod(delta: number) {
    void goToPeriod(periodOffset + delta);
  }

  function openMonthPicker() {
    monthPicker = true;
  }

  function celebrateMascot(msgEn: string, msgTh: string, durationMs = 3200) {
    mascotMood = "happy";
    mascotSpeech = lang === "th" ? msgTh : msgEn;
    if (mascotTimer) clearTimeout(mascotTimer);
    mascotTimer = setTimeout(() => {
      mascotMood = "idle";
      mascotSpeech = null;
    }, durationMs);
  }

  function handleMascotTap() {
    tapCount += 1;
    const linesEn = [
      "Oink! Pull down at the top to scan new slips!",
      "Your records stay on your phone — your money stays yours!",
      "Saving every satang like a pro piggy!",
      "Tap any slip row to inspect the attached photo!",
    ];
    const linesTh = [
      "อู๊ดๆ! ดึงหน้าจอลงค้างไว้เพื่อสแกนสลิปใหม่ได้เลย!",
      "รายการเงินอยู่ในเครื่องคุณ ปลอดภัยหายห่วง!",
      "เก็บออมทุกบาททุกสตางค์ เก่งมากมนุษย์หมู!",
      "แตะที่รายการเพื่อดูรูปสลิปเต็มจอได้นะ!",
    ];
    const idx = tapCount % linesEn.length;
    celebrateMascot(linesEn[idx], linesTh[idx], 2800);
  }

  let homeMain = $state<HTMLElement | null>(null);
  let monthDrag = $state(0);
  let monthDragging = $state(false);
  let gesture: { x: number; y: number; axis: "undecided" | "h" | "v" } | null = null;
  let periodRequest = 0;

  function onHomeTouchStart(e: TouchEvent) {
    if (activeTab !== "home" || anyModalOpen || isScanning) return;
    const target = e.target;
    if (target instanceof Element && target.closest("[data-swipe-row], button, a, input")) return;
    if (e.touches.length !== 1) return;
    gesture = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      axis: "undecided",
    };
    pullDistance = 0;
    pullArmed = false;
    monthDrag = 0;
    monthDragging = false;
  }

  function onHomeTouchMove(e: TouchEvent) {
    if (!gesture || isScanning || anyModalOpen || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - gesture.x;
    const dy = e.touches[0].clientY - gesture.y;
    if (gesture.axis === "undecided") {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      gesture.axis = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (gesture.axis === "h") {
      monthDragging = true;
      monthDrag = Math.max(-96, Math.min(96, dx));
      if (e.cancelable) e.preventDefault();
      return;
    }
    if (window.scrollY > 4 && pullDistance === 0) return;
    if (dy <= 8) {
      pullDistance = 0;
      pullArmed = false;
      return;
    }
    pullDistance = Math.min(148, (dy - 8) * 0.5);
    pullArmed = pullDistance >= PULL_THRESHOLD;
    if (e.cancelable) e.preventDefault();
  }

  function onHomeTouchEnd() {
    if (gesture?.axis === "h") {
      const dx = monthDrag;
      gesture = null;
      monthDragging = false;
      monthDrag = 0;
      if (dx <= -48) void changePeriod(1);
      else if (dx >= 48) void changePeriod(-1);
      return;
    }
    const shouldScan = pullArmed && !isScanning;
    gesture = null;
    pullDistance = 0;
    pullArmed = false;
    if (shouldScan) void triggerSlipScan();
  }

  function onHomeTouchCancel() {
    gesture = null;
    monthDragging = false;
    monthDrag = 0;
    pullDistance = 0;
    pullArmed = false;
  }

  function openOnboarding(firstRun: boolean) {
    // Only a brand-new install starts in the device language. A tour resumed after the
    // app was closed (or replayed) keeps the language already saved, including one the
    // user picked in Quick setup before closing.
    onboardingLanguage =
      firstRun && firstRunState === "new" ? deviceLanguage() : settings.language;
    if (firstRun) markOnboardingPending();
    onboardingReplay = !firstRun;
    showOnboarding = true;
  }

  function closeOnboarding() {
    const firstRun = !onboardingReplay;
    markOnboardingDone();
    // The first tour is the end of a fresh install: it has no "what's new" to catch up on.
    if (firstRun) markWhatsNewSeen();
    showOnboarding = false;
    activeTab = "home";
    settingsSubPage = null;
    // The first tour ends by reading the slips it just got access to, so nobody has to
    // start the scan again (#47). A replayed tour leaves scanning alone.
    if (firstRun && !isScanning && hasAndroidBridge() && window.MooJotAndroid?.hasGalleryPermission()) {
      void startSlipScan(monthStartSec(1 - FIRST_SCAN_MONTHS));
    }
  }

  // First run: show the welcome tour unless this install already has data.
  $effect(() => {
    if (firstRunState === "done" || firstRunState === "returning") {
      if (firstRunState === "returning") markOnboardingDone();
      return;
    }
    void (async () => {
      try {
        const [s, h, months] = await Promise.all([
          api.getSettings(),
          api.getHomeData(0),
          api.listScannedMonths(),
        ]);
        settings = s;
        const hasData = h.dayGroups.length > 0 || h.futureRecords.length > 0 || months.length > 0;
        if (firstRunState === "new" && hasData) {
          markOnboardingDone();
          return;
        }
      } catch (e) {
        console.warn("onboarding: could not check existing data", e);
      }
      openOnboarding(true);
    })();
  });


  // ---- App lock (#79) ----
  function setRecentsHidden(hidden: boolean) {
    window.MooJotAndroid?.setRecentsHidden?.(hidden);
  }

  async function unlockApp() {
    if (unlocking) return;
    unlocking = true;
    lockMessage = null;
    const result = await requestUnlock({ reason: t(lang, "appLockReason"), title: "OpenJot" });
    unlocking = false;
    hiddenAt = null;
    if (result === "unlocked") {
      lockState = "open";
    } else if (result === "no-screen-lock") {
      // The phone's screen lock was removed after the app lock was turned on. There is nothing
      // to check against, so open rather than lock the person out of their only copy.
      await saveAppLock(false);
      lockState = "open";
      scanBanner = t(lang, "appLockTurnedOff");
      setTimeout(() => (scanBanner = null), 6000);
    } else {
      lockMessage = result === "lockout" ? t(lang, "appLockLockout") : null;
    }
  }

  /** Saves the lock switch on top of the stored settings, never on top of a stale copy. */
  async function saveAppLock(on: boolean) {
    const current = await api.getSettings();
    const next = { ...current, appLockEnabled: on };
    await api.updateSettings(next);
    settings = { ...settings, appLockEnabled: on };
    setRecentsHidden(on);
  }

  /** The My Moo switch. Turning it on needs one successful unlock first; returns why not, if not. */
  async function changeAppLock(on: boolean): Promise<string | null> {
    if (on) {
      const result = await requestUnlock({ reason: t(lang, "appLockEnableReason"), title: "OpenJot" });
      hiddenAt = null;
      if (result === "no-screen-lock") return t(lang, "appLockNoScreenLock");
      if (result === "lockout") return t(lang, "appLockLockout");
      if (result !== "unlocked") return result === "cancelled" ? null : t(lang, "appLockFailed");
    }
    try {
      await saveAppLock(on);
    } catch (error) {
      console.error("save app lock", error);
      return t(lang, "appLockFailed");
    }
    track("setting_changed", { setting: "app_lock", value: on ? "on" : "off" });
    return null;
  }

  /** Settings screens keep their own draft; the lock switch is saved separately, so keep it. */
  function withAppLock(next: AppSettings): AppSettings {
    return { ...next, appLockEnabled: settings.appLockEnabled };
  }

  // Launch: read the setting, then lock or open.
  $effect(() => {
    if (lockState !== "checking") return;
    void (async () => {
      try {
        const s = await api.getSettings();
        settings = s;
        setRecentsHidden(s.appLockEnabled);
        if (s.appLockEnabled) {
          lockState = "locked";
          void unlockApp();
          return;
        }
      } catch (error) {
        console.error("app lock: could not read settings", error);
      }
      lockState = "open";
    })();
  });

  // Background and back: cover when leaving; ask again only after more than a minute away.
  $effect(() => {
    const onLockVisibility = () => {
      // Android's prompt can pause the app; that is not "leaving".
      if (!settings.appLockEnabled || unlocking || lockState === "checking") return;
      if (document.visibilityState === "hidden") {
        if (lockState === "open") {
          hiddenAt = Date.now();
          lockState = "away";
        }
        return;
      }
      if (lockState === "locked") {
        // Left while the lock card was up: offer the prompt again on the way back.
        void unlockApp();
        return;
      }
      if (lockState !== "away") return;
      if (lockOnReturn(settings.appLockEnabled, hiddenAt, Date.now())) {
        lockState = "locked";
        void unlockApp();
      } else {
        hiddenAt = null;
        lockState = "open";
      }
    };
    document.addEventListener("visibilitychange", onLockVisibility);
    return () => document.removeEventListener("visibilitychange", onLockVisibility);
  });

  // ---- Daily reminder (#80) ----
  // Keep Android's copy (DailyReminder.kt) in step with the saved setting and the language.
  $effect(() => {
    if (!settingsReady) return;
    const c = reminderConfig(settings);
    window.MooJotAndroid?.configureReminder?.(c.enabled, c.hour, c.minute, c.title, c.body);
  });

  /** Something was jotted or scanned today: the reminder stays quiet until tomorrow. */
  function noteJotted() {
    window.MooJotAndroid?.markJotted?.(localDateKey(new Date()));
  }

  /** Android 13+ asks for notification permission; older versions already allow it. */
  function ensureNotificationPermission(): Promise<boolean> {
    const bridge = window.MooJotAndroid;
    if (!bridge?.requestNotificationPermission) return Promise.resolve(false);
    if (bridge.hasNotificationPermission?.()) return Promise.resolve(true);
    return new Promise((resolve) => {
      const onAnswer = (ev: Event) => {
        window.removeEventListener("moojot:notification-permission", onAnswer);
        resolve(Boolean((ev as CustomEvent<{ granted?: boolean }>).detail?.granted));
      };
      window.addEventListener("moojot:notification-permission", onAnswer);
      bridge.requestNotificationPermission?.();
    });
  }

  /** The My Moo reminder switch and time. Returns why it couldn't change, or null. */
  async function changeReminder(enabled: boolean, time: string): Promise<string | null> {
    if (enabled && !(await ensureNotificationPermission())) return t(lang, "reminderNoPermission");
    try {
      // On top of the stored settings, never on top of a stale copy.
      const current = await api.getSettings();
      await api.updateSettings({ ...current, reminderEnabled: enabled, reminderTime: time });
    } catch (error) {
      console.error("save daily reminder", error);
      return t(lang, "error");
    }
    if (enabled !== settings.reminderEnabled) {
      track("setting_changed", { setting: "daily_reminder", value: enabled ? "on" : "off" });
    }
    settings = { ...settings, reminderEnabled: enabled, reminderTime: time };
    return null;
  }

  /** Settings screens keep their own draft; the reminder is saved separately, so keep it. */
  function withReminder(next: AppSettings): AppSettings {
    return { ...next, reminderEnabled: settings.reminderEnabled, reminderTime: settings.reminderTime };
  }

  // ---- Home-screen widget (#81) ----
  // Re-sends this period's numbers whenever Home data, the language, the theme or the lock change.
  // The widget always shows this period with no account filter, so another view fetches it.
  $effect(() => {
    if (!settingsReady) return;
    const options = {
      lang,
      theme,
      hideAmounts: settings.appLockEnabled,
      baht: (satang: number) => `฿${formatBaht(satang)}`,
    };
    const current = periodOffset === 0 && filterAccountIds.length === 0 ? home : null;
    void syncWidget(current, options);
  });

  async function syncWidget(current: HomePayload | null, options: Parameters<typeof widgetSnapshot>[2]) {
    const bridge = window.MooJotAndroid;
    if (!bridge?.updateWidget) return;
    try {
      const data = current ?? (await api.getHomeData(0));
      bridge.updateWidget(JSON.stringify(widgetSnapshot(data, localDateKey(new Date()), options)));
    } catch (error) {
      console.error("widget sync", error);
    }
  }

  // A widget button opened the app: "+ Jot" opens a new record, "Scan" scans slips. It waits
  // until the app is open (after the lock, if it is on) and the welcome tour is closed.
  let pendingWidgetAction = $state<WidgetAction | null>(null);
  $effect(() => {
    const take = () => {
      const action = parseWidgetAction(window.MooJotAndroid?.takeWidgetAction?.());
      if (action) pendingWidgetAction = action;
    };
    take();
    window.addEventListener("moojot:widget-action", take);
    return () => window.removeEventListener("moojot:widget-action", take);
  });
  $effect(() => {
    if (lockState !== "open" || showOnboarding || showWhatsNew || !pendingWidgetAction) return;
    const action = pendingWidgetAction;
    pendingWidgetAction = null;
    untrack(() => {
      activeTab = "home";
      if (action === "add") {
        editingRecord = null;
        recordLightboxOpen = false;
        showFabMenu = false;
        showRecordSheet = true;
      } else {
        void triggerSlipScan();
      }
    });
  });

  // Post the recurring records that have come due, so Home shows them.
  async function postDueRecurring(): Promise<number> {
    try {
      return await api.postDueRecurringRecords();
    } catch (error) {
      console.error("post due recurring records", error);
      return 0;
    }
  }

  async function refreshAll() {
    await postDueRecurring();
    const [s, accs, cats, tgs] = await Promise.all([
      api.getSettings(),
      api.getAccounts(),
      api.getCategories(),
      api.getTags(),
    ]);
    settings = s;
    settingsReady = true;
    accounts = accs;
    categories = cats;
    tags = tgs;
    scannedMonths = await api.listScannedMonths();
    await refreshPeriodData();
  }

  async function refreshPeriodData() {
    const [h, sum, cmp, bdgs] = await Promise.all([
      api.getHomeData(periodOffset, filterAccountIds),
      api.getSummaryData(periodOffset, summaryKind, filterAccountIds),
      api.getCompareData(periodOffset, summaryKind, 6, filterAccountIds),
      api.getBudgets(periodOffset, filterAccountIds),
    ]);
    home = h;
    summary = sum;
    compare = cmp;
    budgets = bdgs;
  }

  async function handleCandidates(candidates: SlipScanCandidate[], trigger: "photo" | "shared") {
    try {
      const report: SlipScanReport = await api.importSlipCandidates(candidates);
      noteJotted();
      if (trigger === "photo") noteSuccessfulScan();
      track("slip_scan_finished", { trigger, imported: report.imported, duplicates: report.duplicates });
      scanBanner =
        lang === "th"
          ? `สแกน ${report.scanned} · นำเข้า ${report.imported} · ซ้ำ ${report.duplicates}`
          : `Scanned ${report.scanned} · Imported ${report.imported} · Dup ${report.duplicates}`;
      await refreshPeriodData();
      celebrateMascot(
        report.imported > 0 ? `Imported ${report.imported} new slip(s)!` : "All slips are up to date!",
        report.imported > 0 ? `นำเข้าสลิปใหม่ ${report.imported} รายการแล้ว!` : "สลิปทั้งหมดอัปเดตล่าสุดแล้ว!"
      );
    } catch (e) {
      track("slip_scan_failed", { trigger });
      scanBanner = `Scan error: ${String(e)}`;
    } finally {
      isScanning = false;
      setTimeout(() => (scanBanner = null), 4500);
    }
  }

  // Month helpers follow the "Month starts on" period, like the backend. Scanned
  // months are stored as "YYYY-MM" keys: the calendar month a period starts in.
  function monthStartSec(offset: number): number {
    return Math.floor(monthPeriod(offset, settings.monthStartDay).start.getTime() / 1000);
  }

  function periodLabel(period: MonthPeriod): string {
    if (clampMonthStartDay(settings.monthStartDay) !== 1) return periodRangeLabel(period);
    return period.start.toLocaleDateString(lang === "th" ? "th-TH" : "en-US", {
      month: "short",
      year: "2-digit",
    });
  }

  function monthLabel(offset: number): string {
    return periodLabel(monthPeriod(offset, settings.monthStartDay));
  }

  function monthKey(offset: number): string {
    return monthPeriod(offset, settings.monthStartDay).key;
  }

  function formatMonthKey(key: string): string {
    const period = periodForKey(key, settings.monthStartDay);
    return period ? periodLabel(period) : key;
  }

  function monthKeysFromSince(sinceSec: number): string[] {
    return periodKeysSince(new Date(sinceSec * 1000), settings.monthStartDay);
  }

  async function triggerSlipScan() {
    showFabMenu = false;
    if (!hasAndroidBridge() || !window.MooJotAndroid) {
      scanBanner =
        lang === "th"
          ? "การสแกนอัลบั้มสลิปใช้งานได้บนแอป Android"
          : "Gallery slip scanning runs on the Android app.";
      setTimeout(() => (scanBanner = null), 3500);
      return;
    }
    if (!window.MooJotAndroid.hasGalleryPermission()) {
      window.MooJotAndroid.requestGalleryPermission();
      return;
    }
    if (!scannedMonths.includes(monthKey(periodOffset))) {
      scanStartPrompt = true;
      return;
    }
    await startSlipScan(monthStartSec(periodOffset));
  }

  async function startSlipScan(sinceSec: number) {
    if (!window.MooJotAndroid) return;
    scanSinceSec = sinceSec;
    scanStartPrompt = false;
    isScanning = true;
    scanTotals = { imported: 0, duplicates: 0 };
    scanChainFailed = false;
    scanTrigger = "album";
    track("slip_scan_started", { trigger: "album" });
    scanBanner = lang === "th" ? "กำลังสแกนสลิปใหม่..." : "Scanning new slips...";
    const [keywords, knownIds] = await Promise.all([
      api.getAlbumScanKeywords(),
      api.listKnownSlipMediaIds(),
    ]);
    window.MooJotAndroid.scanBankSlips(
      JSON.stringify(keywords),
      settings.allowSharedAlbum,
      sinceSec,
      JSON.stringify(knownIds)
    );
  }

  function triggerPickPhoto() {
    showFabMenu = false;
    if (hasAndroidBridge() && window.MooJotAndroid) {
      isScanning = true;
      scanTrigger = "photo";
      track("slip_scan_started", { trigger: "photo" });
      window.MooJotAndroid.pickSlipPhoto(false);
    }
  }

  // Reset scroll position to top when switching bottom tabs
  $effect(() => {
    void activeTab;
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  });

  // Lock background body scroll whenever any fullscreen modal/sheet is open
  $effect(() => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = anyModalOpen ? "hidden" : "";
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  });

  // Wire Android hardware/gesture Back button handler
  $effect(() => {
    window.__moojotHandleBack = () => {
      // The lock card covers everything: Back only leaves the app, never moves the screen under it.
      if (lockState !== "open") return `root:${lang}`;
      // The tour covers everything else, so Back belongs to it first.
      if (showOnboarding) {
        onboardingBack?.();
        return "handled";
      }
      if (showWhatsNew) {
        whatsNewSheet.current?.();
        return "handled";
      }
      if (monthPicker) {
        monthSheet.current?.();
        return "handled";
      }
      if (scanStartPrompt) {
        scanSheet.current?.();
        return "handled";
      }
      if (pdfPrompt) {
        pdfPrompt = null;
        pdfPassword = "";
        return "handled";
      }
      if (recordLightboxOpen) {
        recordLightboxOpen = false;
        return "handled";
      }
      if (showRecordSheet) {
        showRecordSheet = false;
        editingRecord = null;
        return "handled";
      }
      if (showRulesModal) {
        showRulesModal = false;
        return "handled";
      }
      if (showSearch) {
        showSearch = false;
        return "handled";
      }
      if (showFilterSheet) {
        filterSheet.current?.();
        return "handled";
      }
      if (showFabMenu) {
        showFabMenu = false;
        return "handled";
      }
      if (activeTab === "settings" && settingsSubPage !== null) {
        settingsSubPage =
          settingsSubPage === "terms" || settingsSubPage === "privacy" || settingsSubPage === "licenses"
            ? "about"
            : null;
        return "handled";
      }
      if (activeTab !== "home") {
        activeTab = "home";
        return "handled";
      }
      return `root:${lang}`;
    };
    return () => {
      delete window.__moojotHandleBack;
    };
  });

  $effect(() => {
    refreshAll();

    const onCandidates = (ev: Event) => {
      const detail = (ev as CustomEvent<SlipScanCandidate[]>).detail;
      if (Array.isArray(detail)) handleCandidates(detail, "photo");
    };
    const onSharedSlips = (ev: Event) => {
      const detail = (ev as CustomEvent<SlipScanCandidate[]>).detail;
      if (Array.isArray(detail)) handleCandidates(detail, "shared");
    };
    const onPerm = (ev: Event) => {
      const detail = (ev as CustomEvent<{ granted: boolean }>).detail;
      track("photo_permission_answered", { granted: Boolean(detail?.granted) });
      // During onboarding, granting access shouldn't start a scan behind it.
      if (detail?.granted && !showOnboarding) triggerSlipScan();
    };
    const onErr = (ev: Event) => {
      const detail = (ev as CustomEvent<{ error: string }>).detail;
      track("slip_scan_failed", { trigger: scanTrigger });
      scanChainFailed = true;
      isScanning = false;
      scanBanner = detail?.error ?? "Scan error";
      setTimeout(() => (scanBanner = null), 3500);
    };
    const onBackfill = async (ev: Event) => {
      const detail = (
        ev as CustomEvent<
          { contentSha256: string; imagePath: string | null; ocrText: string | null }[]
        >
      ).detail;
      if (Array.isArray(detail) && detail.length > 0) {
        await api.applySlipBackfill(detail);
      }
      const res = await api.reparseAllSlips();
      scanBanner =
        lang === "th"
          ? `อัปเดต ${res.updated} · โอนเงิน ${res.transfersDetected} · แนบสลิปแล้ว`
          : `Updated ${res.updated} · Transfers ${res.transfersDetected} · Slips attached`;
      await refreshPeriodData();
      isScanning = false;
      activeTab = "home";
      celebrateMascot("Slips refreshed & attached!", "อัปเดตและแนบสลิปเรียบร้อย!");
      setTimeout(() => (scanBanner = null), 5000);
    };

    const onScanBatch = (ev: Event) => {
      const detail = (
        ev as CustomEvent<{
          candidates?: SlipScanCandidate[];
          seenIds?: string[];
          done?: boolean;
        }>
      ).detail;
      scanChain = scanChain
        .then(async () => {
          const seen = detail?.seenIds ?? [];
          if (seen.length > 0) await api.rememberScannedMedia(seen);
          const candidates = detail?.candidates ?? [];
          if (candidates.length > 0) {
            const report = await api.importSlipCandidates(candidates);
            scanTotals.imported += report.imported;
            scanTotals.duplicates += report.duplicates;
            scanBanner =
              lang === "th"
                ? `นำเข้า ${report.imported} · ซ้ำ ${report.duplicates}`
                : `Imported ${report.imported} · duplicates ${report.duplicates}`;
            await refreshPeriodData();
            if (report.imported > 0) {
              celebrateMascot(
                `Imported ${report.imported} new slip(s)!`,
                `นำเข้าสลิปใหม่ ${report.imported} รายการแล้ว!`
              );
            }
          }
          if (detail?.done) {
            noteJotted();
            if (!scanChainFailed) noteSuccessfulScan();
            track("slip_scan_finished", { trigger: "album", ...scanTotals });
            const covered = monthKeysFromSince(scanSinceSec);
            if (covered.length > 0) {
              await api.rememberScannedMonths(covered);
              scannedMonths = [...new Set([...covered, ...scannedMonths])].sort().reverse();
            }
            isScanning = false;
            if (!candidates.length) {
              scanBanner = lang === "th" ? "ไม่มีสลิปใหม่" : "No new slips";
            }
            setTimeout(() => (scanBanner = null), 4000);
          }
        })
        .catch((error) => {
          scanChainFailed = true;
          isScanning = false;
          scanBanner = String(error);
        });
    };

    const onSharedPdf = (ev: Event) => {
      const detail = (ev as CustomEvent<{ pdfBase64?: string }>).detail;
      const pdfBase64 = detail?.pdfBase64;
      if (pdfBase64) void importPdfBase64(pdfBase64, null);
    };
    const onVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;
      if ((await postDueRecurring()) > 0) await refreshPeriodData();
    };

    window.addEventListener("moojot:scan-candidates", onCandidates);
    window.addEventListener("moojot:scan-batch", onScanBatch);
    window.addEventListener("moojot:shared-slips", onSharedSlips);
    window.addEventListener("moojot:permission", onPerm);
    window.addEventListener("moojot:scan-error", onErr);
    window.addEventListener("moojot:backfill-done", onBackfill);
    window.addEventListener("moojot:shared-pdf", onSharedPdf);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("moojot:scan-candidates", onCandidates);
      window.removeEventListener("moojot:scan-batch", onScanBatch);
      window.removeEventListener("moojot:shared-slips", onSharedSlips);
      window.removeEventListener("moojot:permission", onPerm);
      window.removeEventListener("moojot:scan-error", onErr);
      window.removeEventListener("moojot:backfill-done", onBackfill);
      window.removeEventListener("moojot:shared-pdf", onSharedPdf);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  });

  function categoryMeta(id: string | null) {
    return categories.find((c) => c.id === id) ?? null;
  }

  function accountMeta(id: string | null) {
    return accounts.find((a) => a.id === id) ?? null;
  }

  async function runSearch(q: string) {
    searchQuery = q;
    if (!q.trim()) {
      searchResults = [];
      return;
    }
    searchResults = await api.searchRecords(q);
  }

  async function handleSaveRecord(input: RecordInput) {
    await api.saveRecord(input);
    if (!input.id) noteJotted();
    track("record_saved", { kind: input.kind, is_new: !input.id, recurring: Boolean(input.recurringFrequency) });
    showRecordSheet = false;
    recordLightboxOpen = false;
    editingRecord = null;
    // A backdated recurring record may already have dates that are due.
    if (input.recurringFrequency) await postDueRecurring();
    await refreshPeriodData();
    celebrateMascot("Jotted! Nice job!", "จดเรียบร้อยแล้ว เยี่ยมมาก!");
  }

  async function handleDeleteRecord(id: string) {
    await api.deleteRecord(id);
    track("record_deleted", { via: "sheet" });
    showRecordSheet = false;
    recordLightboxOpen = false;
    editingRecord = null;
    await refreshPeriodData();
  }

  function commitQueuedDelete(id: string) {
    deleteChain = deleteChain
      .then(async () => {
        await api.deleteRecord(id);
        track("record_deleted", { via: "swipe" });
      })
      .catch(() => {});
  }

  async function flushDeletes() {
    await deleteChain;
    if (undoDelete === null) await refreshPeriodData();
  }

  function queueSwipeDelete(rec: RecordItem) {
    if (!home) return;
    if (undoDelete) {
      clearTimeout(undoDelete.timer);
      commitQueuedDelete(undoDelete.recordId);
      undoDelete = null;
    }
    const snapshot = {
      home: $state.snapshot(home),
      summary: summary ? $state.snapshot(summary) : null,
      compare: compare ? $state.snapshot(compare) : null,
    };
    home = omitRecord(home, rec.id);
    if (summary) summary = omitFromSummary(summary, rec, summaryKind);
    if (compare && rec.kind === summaryKind) {
      compare = omitFromCompare(compare, rec.amountSatang);
    }
    openSwipeId = null;
    const timer = setTimeout(() => {
      undoDelete = null;
      commitQueuedDelete(rec.id);
      void flushDeletes();
    }, 4500);
    undoDelete = {
      recordId: rec.id,
      home: snapshot.home,
      summary: snapshot.summary,
      compare: snapshot.compare,
      timer,
    };
  }

  function undoSwipeDelete() {
    if (!undoDelete) return;
    clearTimeout(undoDelete.timer);
    home = undoDelete.home;
    summary = undoDelete.summary;
    compare = undoDelete.compare;
    undoDelete = null;
  }

  async function importPdfBase64(pdfBase64: string, password: string | null) {
    pdfBusy = true;
    try {
      const report = await api.importStatementPdf(pdfBase64, password);
      if (report.needsPassword || report.wrongPassword) {
        pdfPrompt = { pdfBase64, wrong: report.wrongPassword };
        pdfPassword = "";
        return;
      }
      pdfPrompt = null;
      pdfPassword = "";
      track("statement_imported", { imported: report.imported, duplicates: report.duplicates });
      if (report.imported > 0) noteJotted();
      await refreshPeriodData();
      activeTab = "home";
      scanBanner =
        report.imported === 0 && report.message
          ? report.message
          : lang === "th"
            ? `นำเข้า ${report.imported} รายการ · ซ้ำ ${report.duplicates}`
            : `Imported ${report.imported} · duplicates ${report.duplicates}`;
      setTimeout(() => (scanBanner = null), 5000);
    } catch (error) {
      scanBanner = error instanceof Error ? error.message : t(lang, "error");
      setTimeout(() => (scanBanner = null), 4000);
    } finally {
      pdfBusy = false;
    }
  }
</script>

<div class="min-h-screen max-w-full overflow-x-clip bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col">
  {#if activeTab === "home"}
    <header
      class="fixed inset-x-0 top-0 z-40 text-white transition-transform duration-200 ease-out {stickyVisible
        ? 'translate-y-0'
        : '-translate-y-full pointer-events-none'}"
      style="padding-top: env(safe-area-inset-top); background: linear-gradient(180deg, var(--hero-from), var(--hero-to)); outline: 1px solid var(--hero-border); outline-offset: -1px;"
      aria-hidden={!stickyVisible}
    >
      <div class="flex items-center justify-between gap-3 px-4 py-3 {hand === 'left' ? 'flex-row-reverse' : ''}">
        <div class="min-w-0">
          <button
            type="button"
            class="truncate text-left text-sm font-extrabold"
            onclick={openMonthPicker}
          >
            {home?.period.label ?? "..."}
          </button>
          <div class="truncate text-xs font-semibold text-white/85">
            {t(lang, "totalSpending")} {formatBaht(home?.totalSpendingSatang ?? 0, true)}
          </div>
        </div>
        <button
          type="button"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold"
          style="background-color: var(--hero-btn-bg); color: var(--hero-btn-text);"
          onclick={() => (activeTab = "summary")}
        >
          <PieChart class="size-3.5" />
          <span>{t(lang, "summary")}</span>
        </button>
      </div>
    </header>

    <main
      bind:this={homeMain}
      class="flex-1 overflow-x-clip pb-28 touch-pan-y"
      ontouchstart={onHomeTouchStart}
      ontouchend={onHomeTouchEnd}
      ontouchcancel={onHomeTouchCancel}
    >
      <div
        bind:this={heroEl}
        role="group"
        class="relative overflow-hidden shadow-xl"
        style="background: linear-gradient(180deg, var(--hero-from), var(--hero-to)); outline: 1px solid var(--hero-border); outline-offset: -1px; border-radius: 0 0 28px 28px;"
      >
        <svg class="ds-hero-waves pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 360 228" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <path d="M0 150 C90 118 150 176 230 146 C290 126 330 160 360 140 L360 228 L0 228 Z" fill="#ffffff" opacity="0.2" />
          <path d="M0 184 C100 158 170 206 250 178 C300 160 330 186 360 172 L360 228 L0 228 Z" fill="#ffffff" opacity="0.34" />
        </svg>

        <div class="relative z-10 flex min-h-[228px] flex-col px-4 pb-3" style="padding-top: max(env(safe-area-inset-top), 28px);">
          {#if pullDistance > 8 && !isScanning}
            <div class="flex items-end justify-center overflow-hidden" style="height: {Math.round(pullDistance)}px;">
              <p class="pb-2 text-center text-xs font-bold text-white">
                {pullArmed
                  ? lang === "th"
                    ? "ปล่อยเพื่อสแกน · เลื่อนขึ้นเพื่อยกเลิก"
                    : "Release to scan · slide up to cancel"
                  : lang === "th"
                    ? "ดึงค้างไว้เพื่อสแกนสลิป"
                    : "Pull and hold to scan slips"}
              </p>
            </div>
          {/if}
          <div class="flex items-start justify-between gap-3 {hand === 'left' ? 'flex-row-reverse' : ''}">
            <div class="min-w-0 {hand === 'left' ? 'text-right' : ''}">
              <div class="text-[11px] font-semibold text-white/85">
                {t(lang, "totalSpending")}
              </div>
              <div class="text-2xl font-extrabold leading-tight text-white">
                {formatBaht(home?.totalSpendingSatang ?? 0, true)}
              </div>
              {#if isScanning}
                <div class="mt-1 text-[11px] font-bold text-white">
                  {lang === "th" ? "กำลังสแกน..." : "Scanning..."}
                </div>
              {/if}
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="flex size-9 items-center justify-center rounded-full bg-white text-[#18181b] shadow-sm"
                aria-label={t(lang, "search")}
                onclick={() => {
                  showSearch = true;
                  searchQuery = "";
                  searchResults = [];
                }}
              >
                <Search class="size-4" />
              </button>
              <button
                type="button"
                class="relative flex size-9 items-center justify-center rounded-full bg-white text-[#18181b] shadow-sm"
                aria-label={t(lang, "filterRecords")}
                onclick={() => (showFilterSheet = true)}
              >
                <Wallet class="size-4" />
                {#if filterAccountIds.length > 0}
                  <span class="absolute right-0.5 top-0.5 size-2 rounded-full bg-[var(--brand)]"></span>
                {/if}
              </button>
            </div>
          </div>

          {#if scanBanner || mascotSpeech}
            <div
              class="pointer-events-none absolute top-[40%] z-20 {hand === 'right' ? 'left-[34%] right-4' : 'left-4 right-[34%]'}"
            >
              <div class="relative mx-auto w-fit max-w-[168px] rounded-2xl bg-white px-3 py-1.5 text-left text-[11px] font-bold leading-snug text-[#18181b] shadow-lg">
                {scanBanner || mascotSpeech}
                <span
                  class="absolute -bottom-1 size-2.5 rotate-45 bg-white {hand === 'right' ? 'left-3' : 'right-3'}"
                ></span>
              </div>
            </div>
          {/if}

          <div class="mt-auto flex items-end justify-between gap-2 {hand === 'right' ? 'flex-row-reverse' : ''}">
            <div class="flex min-w-0 items-center gap-1 pb-2">
              <button
                type="button"
                class="flex size-8 items-center justify-center rounded-full bg-white text-[#18181b] shadow-sm"
                aria-label="Previous period"
                onclick={() => changePeriod(-1)}
              >
                <ChevronLeft class="size-4" />
              </button>
              <button
                type="button"
                class="truncate rounded-full px-3 py-1 text-xs font-bold {periodOffset === 0
                  ? 'bg-[var(--brand)] text-[var(--brand-contrast)]'
                  : 'bg-white text-[#18181b]'}"
                onclick={openMonthPicker}
              >
                {home?.period.label ?? "..."}
              </button>
              <button
                type="button"
                class="flex size-8 items-center justify-center rounded-full bg-white text-[#18181b] shadow-sm"
                aria-label="Next period"
                onclick={() => changePeriod(1)}
              >
                <ChevronRight class="size-4" />
              </button>
            </div>
            <div class="relative shrink-0">
              <MooMascot
                mood={isScanning || pullArmed ? "scan" : mascotMood}
                size="hero"
                onTap={handleMascotTap}
                alt="OpenJot mascot"
              />
            </div>
          </div>
        </div>
      </div>

      {#if whatsNewBanner.length > 0}
        {@const bannerVersion = whatsNewBanner[0].version}
        <div
          id="whats-new-banner"
          class="mx-4 mt-4 flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] py-2 pl-3 pr-1 shadow-xs"
        >
          <span class="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Gift class="size-4" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-bold leading-snug text-[var(--text-primary)]">
              {t(lang, "whatsNewTitle").replace("{version}", bannerVersion)}
            </p>
            <p class="line-clamp-2 text-xs leading-snug text-[var(--text-muted)]">
              {whatsNewBanner
                .flatMap((release) => release.items)
                .map((item) => item.title[lang])
                .join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onclick={openWhatsNewPage}
            class="shrink-0 rounded-full border border-[var(--brand)] px-3 py-1.5 text-xs font-extrabold text-[var(--brand-text)] active:bg-[var(--brand-soft)]"
          >
            {t(lang, "whatsNewSeeAll")}
          </button>
          <button
            type="button"
            onclick={() => hideWhatsNewBanner(bannerVersion)}
            aria-label={t(lang, "whatsNewHideBanner")}
            class="flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] active:opacity-75"
          >
            <X class="size-4" />
          </button>
        </div>
      {/if}

      {#if showFeedbackCard}
        <div
          class="mx-4 mt-4 flex items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] py-2 pl-3 pr-1 shadow-xs"
        >
          <span class="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Mail class="size-4" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold leading-snug text-[var(--text-primary)]">{t(lang, "feedbackCardTitle")}</p>
            <button
              type="button"
              onclick={sendFeedbackFromCard}
              class="mt-1.5 rounded-full bg-[var(--brand)] px-3.5 py-1.5 text-xs font-extrabold text-[var(--brand-contrast)] active:bg-[var(--brand-deep)]"
            >
              {t(lang, "sendFeedback")}
            </button>
          </div>
          <button
            type="button"
            onclick={() => updateFeedbackCard({ dismissed: true })}
            aria-label={t(lang, "feedbackNotNow")}
            class="flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] active:opacity-75"
          >
            <X class="size-4" />
          </button>
        </div>
      {/if}

      <div class="overflow-x-clip">
      <div
        class="max-w-full"
        style="transform: translate3d({monthDrag}px, 0, 0); transition: {monthDragging ? 'none' : 'transform 180ms ease'};"
      >
      <!-- Collapsible Future / Recurring Records Drawer -->
      {#if home && home.futureRecords.length > 0}
        <div class="mx-4 mt-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden shadow-xs">
          <button
            type="button"
            onclick={() => (futureExpanded = !futureExpanded)}
            class="w-full px-4 py-3 flex items-center justify-between text-left"
          >
            <div class="flex items-center gap-2.5">
              <span class="size-6 rounded-full bg-[var(--brand-soft)] text-[var(--brand-text)] text-xs font-bold flex items-center justify-center">
                {home.futureRecords.length}
              </span>
              <div>
                <div class="text-xs font-bold text-[var(--text-primary)]">{t(lang, "futureRecords")}</div>
                <div class="text-[11px] text-[var(--text-muted)]">
                  {formatBaht(home.futureTotalSatang, true)}
                </div>
              </div>
            </div>
            {#if futureExpanded}
              <ChevronUp class="size-4 text-[var(--text-muted)]" />
            {:else}
              <ChevronDown class="size-4 text-[var(--text-muted)]" />
            {/if}
          </button>

          {#if futureExpanded}
            <div class="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
              {#each home.futureRecords as f}
                {@const cat = categoryMeta(f.categoryId)}
                <div class="px-4 py-3 flex items-center justify-between bg-[var(--bg-card-sub)]">
                  <div class="flex items-center gap-3">
                    <CategoryIcon
                      icon={cat?.icon ?? "leaf"}
                      color={cat?.color ?? "#71717a"}
                      size="sm"
                    />
                    <div>
                      <div class="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <span>
                          {cat ? (lang === "th" ? cat.nameTh : cat.nameEn) : t(lang, "spending")}
                        </span>
                        <Repeat class="size-3 text-[var(--brand)]" />
                      </div>
                      <div class="text-[11px] text-[var(--text-muted)]">
                        {f.dueDate}{f.note ? ` · ${f.note}` : ""}
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-[var(--text-primary)]">
                      {formatBaht(f.amountSatang)}
                    </span>
                    <button
                      type="button"
                      onclick={async () => {
                        await api.deleteRecurringRule(f.ruleId);
                        await refreshPeriodData();
                      }}
                      class="text-[var(--text-muted)] hover:text-rose-500 text-xs"
                      aria-label="Remove recurring"
                    >
                      <X class="size-4" />
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Daily Day-Gutter Timeline -->
      <div class="mt-4 space-y-3">
        {#if !home || home.dayGroups.length === 0}
          <div class="mx-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 text-center space-y-3 flex flex-col items-center shadow-xs">
            <EmptyMonthArt alt={t(lang, "noRecords")} />
            <div class="text-sm font-bold text-[var(--text-primary)]">{t(lang, "noRecords")}</div>
            <p class="text-xs text-[var(--text-muted)]">{t(lang, "emptyHint")}</p>
          </div>
        {:else}
          {#each home.dayGroups as group}
            <div class="flex items-stretch">
              <!-- Left Day Gutter -->
              <div class="w-16 shrink-0 flex flex-col items-center pt-2 relative">
                <span
                  class="absolute left-0 top-2 bottom-2 w-1 rounded-r-full {group.dayOfWeek === 'Today'
                    ? 'bg-[var(--brand)]'
                    : 'bg-[var(--border-strong)]'}"
                ></span>
                <span
                  class="text-[11px] font-semibold {group.dayOfWeek === 'Today'
                    ? 'text-[var(--brand-text)]'
                    : 'text-[var(--text-muted)]'}"
                >
                  {group.dayOfWeek}
                </span>
                <span class="text-lg font-extrabold text-[var(--text-primary)] leading-tight">
                  {group.dayNumber}
                </span>
              </div>

              <!-- Day Card Stack -->
              <div class="flex-1 mr-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden shadow-xs">
                <div class="px-4 py-2.5 bg-[var(--bg-card-sub)] flex items-baseline justify-between">
                  <span class="text-[11px] text-[var(--text-muted)] font-medium">
                    {#if group.transferCount > 0}
                      {group.transferCount} {t(lang, "transfers")}
                    {/if}
                  </span>
                  <div class="text-right">
                    <span class="text-[11px] text-[var(--text-muted)] mr-1.5">↑ {t(lang, "spending")}</span>
                    <span class="text-base font-extrabold text-[var(--text-primary)]">
                      {formatBaht(group.spendingSatang)}
                    </span>
                  </div>
                </div>

                <div class="divide-y divide-[var(--border-subtle)]">
                  {#each group.records as rec}
                    {@const cat = categoryMeta(rec.categoryId)}
                    {@const acc = accountMeta(rec.accountId)}
                    <SwipeRecordRow
                      open={openSwipeId === rec.id}
                      deleteLabel={t(lang, "delete")}
                      onOpen={() => (openSwipeId = rec.id)}
                      onClose={() => {
                        if (openSwipeId === rec.id) openSwipeId = null;
                      }}
                      onDelete={() => queueSwipeDelete(rec)}
                      onActivate={() => {
                        editingRecord = rec;
                        recordLightboxOpen = false;
                        showRecordSheet = true;
                      }}
                    >
                      <!-- Brand corner triangle on unreviewed auto-jotted slip -->
                      {#if !rec.isReviewed}
                        <span
                          class="absolute top-0 left-0 size-0 border-t-[12px] border-t-[var(--brand)] border-r-[12px] border-r-transparent"
                        ></span>
                      {/if}

                      <div class="flex items-center gap-3 min-w-0">
                        <CategoryIcon
                          icon={rec.kind === "transfer" ? "transfer" : cat?.icon ?? "leaf"}
                          color={rec.kind === "transfer" ? (theme === "pink-white" ? "#FF4D94" : theme === "orange-black" ? "#FF6B1A" : "#EA580C") : cat?.color ?? "#71717a"}
                          size="sm"
                        />
                        <div class="min-w-0">
                          <div class="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {#if rec.kind === "transfer"}
                              {t(lang, "transfer")}
                            {:else if cat}
                              {lang === "th" ? cat.nameTh : cat.nameEn}
                            {:else}
                              {t(lang, rec.kind === "income" ? "income" : "spending")}
                            {/if}
                          </div>
                          <div
                            class="text-xs truncate {rec.parseStatus !== 'ok'
                              ? 'text-[var(--brand-text)] font-medium'
                              : 'text-[var(--text-muted)]'}"
                          >
                            {rec.payeeRaw || rec.note || (acc ? (lang === "th" ? acc.nameTh : acc.nameEn) : "")}
                          </div>
                        </div>
                      </div>

                      <div class="flex items-center gap-2 shrink-0">
                        {#if rec.parseStatus !== "ok"}
                          <PenLine class="size-4 text-[var(--brand)]" />
                        {/if}
                        {#if rec.source === "recurring"}
                          <Repeat class="size-3.5 text-[var(--text-muted)]" aria-label={t(lang, "recurring")} />
                        {/if}
                        <span
                          class="text-sm font-bold {rec.kind === 'income'
                            ? 'text-emerald-500'
                            : rec.kind === 'transfer'
                              ? 'text-[var(--brand-text)]'
                              : 'text-[var(--text-primary)]'}"
                        >
                          {rec.kind === "income" ? "+" : ""}{formatBaht(rec.amountSatang)}
                        </span>
                      </div>
                    </SwipeRecordRow>
                  {/each}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
      </div>
      </div>
    </main>

    <!-- Speed-Dial Backdrop -->
    {#if showFabMenu}
      <button
        type="button"
        onclick={() => (showFabMenu = false)}
        class="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs"
        aria-label="Close menu"
      ></button>
      <div class="fixed right-4 bottom-36 z-40 flex flex-col items-end gap-3">
        <button
          type="button"
          onclick={triggerSlipScan}
          class="flex items-center gap-3 text-sm font-bold text-white"
        >
          <span>{t(lang, "scanESlips")}</span>
          <span class="size-11 rounded-full bg-[var(--hero-icon-bg)] text-[var(--hero-icon-fg)] flex items-center justify-center shadow-lg">
            <ScanLine class="size-5" />
          </span>
        </button>
        <button
          type="button"
          onclick={triggerPickPhoto}
          class="flex items-center gap-3 text-sm font-bold text-white"
        >
          <span>{lang === "th" ? "นำเข้าจากรูปสลิป" : "Import Slip Photo"}</span>
          <span class="size-11 rounded-full bg-[var(--hero-icon-bg)] text-[var(--hero-icon-fg)] flex items-center justify-center shadow-lg">
            <ImagePlus class="size-5" />
          </span>
        </button>
      </div>
    {/if}

    <!-- Split Floating Action Button (+ Add record | ^) -->
    <div
      class="fixed right-4 z-40 inline-flex items-center rounded-full bg-[var(--brand)] text-[var(--brand-contrast)] shadow-xl overflow-hidden"
      style="bottom: calc(max(env(safe-area-inset-bottom), 20px) + 64px); box-shadow: 0 10px 24px -6px var(--hero-shadow);"
    >
      <button
        type="button"
        onclick={() => {
          editingRecord = null;
          recordLightboxOpen = false;
          showFabMenu = false;
          showRecordSheet = true;
        }}
        class="flex items-center gap-1.5 pl-4 pr-3 py-3 text-sm font-bold active:bg-[var(--brand-deep)]"
      >
        <Plus class="size-4" />
        <span>{t(lang, "addRecord")}</span>
      </button>
      <span class="w-px h-5 bg-[var(--brand-contrast)]/30"></span>
      <button
        type="button"
        onclick={() => (showFabMenu = !showFabMenu)}
        class="px-3 py-3 active:bg-[var(--brand-deep)]"
        aria-label="More actions"
      >
        <ChevronUp class="size-4 transition-transform {showFabMenu ? 'rotate-180' : ''}" />
      </button>
    </div>
  {:else if activeTab === "summary"}
    <SummaryView
      {lang}
      {summary}
      {compare}
      {budgets}
      {categories}
      activeKind={summaryKind}
      onChangeKind={async (k) => {
        summaryKind = k;
        await refreshPeriodData();
      }}
      onPrevPeriod={async () => {
        periodOffset -= 1;
        await refreshPeriodData();
      }}
      onNextPeriod={async () => {
        periodOffset += 1;
        await refreshPeriodData();
      }}
      onAddBudget={async (input) => {
        await api.upsertBudget({
          scopeType: input.scopeType,
          scopeId: input.scopeId,
          periodType: "monthly",
          limitSatang: input.limitSatang,
          alertThresholdPct: 80,
        });
        await refreshPeriodData();
      }}
      onDeleteBudget={async (id) => {
        await api.deleteBudget(id);
        await refreshPeriodData();
      }}
    />
  {:else}
    <SettingsView
      {settings}
      {accounts}
      {categories}
      {tags}
      {isScanning}
      {mascotMood}
      {theme}
      {hand}
      {shareStats}
      appLockAvailable={hasAndroidBridge()}
      appLockEnabled={settings.appLockEnabled}
      onChangeAppLock={changeAppLock}
      reminderAvailable={hasAndroidBridge()}
      reminderEnabled={settings.reminderEnabled}
      reminderTime={settings.reminderTime}
      notificationsBlocked={settings.reminderEnabled && window.MooJotAndroid?.hasNotificationPermission?.() === false}
      onChangeReminder={changeReminder}
      bind:subPage={settingsSubPage}
      {whatsNewUnseen}
      onWhatsNewSeen={markWhatsNewSeen}
      onWhatsNewAction={whatsNewAction}
      onReplayOnboarding={() => openOnboarding(false)}
      onChangeTheme={(nextTheme) => {
        if (nextTheme !== theme) track("setting_changed", { setting: "theme", value: nextTheme });
        theme = nextTheme;
      }}
      onChangeHand={(nextHand) => {
        if (nextHand !== hand) track("setting_changed", { setting: "hand", value: nextHand });
        hand = nextHand;
      }}
      onChangeShareStats={(on) => changeShareStats(on, "settings")}
      onSaveSettings={async (draft) => {
        const next = withReminder(withAppLock(draft));
        await api.updateSettings(next);
        if (next.language !== settings.language) {
          track("setting_changed", { setting: "language", value: next.language });
        }
        if (next.monthStartDay !== settings.monthStartDay) {
          track("setting_changed", { setting: "month_start_day", value: next.monthStartDay });
        }
        settings = next;
        await refreshPeriodData();
      }}
      onToggleAccount={async (id, enabled) => {
        await api.toggleAccountEnabled(id, enabled);
        accounts = await api.getAccounts();
      }}
      onScanNow={triggerSlipScan}
      onPickPhoto={triggerPickPhoto}
      onPickStatement={(pdfBase64) => importPdfBase64(pdfBase64, null)}
      onReparseSlips={async () => {
        if (hasAndroidBridge() && window.MooJotAndroid?.hasGalleryPermission()) {
          const targets = await api.getBackfillTargets();
          if (targets.length > 0) {
            isScanning = true;
            window.MooJotAndroid.backfillExistingSlips(JSON.stringify(targets));
            return;
          }
        }
        const res = await api.reparseAllSlips();
        scanBanner =
          lang === "th"
            ? `อัปเดต ${res.updated} รายการ · โอนเงิน ${res.transfersDetected} · ลบที่ไม่ใช่สลิป ${res.removedNonSlips}`
            : `Updated ${res.updated} · Transfers ${res.transfersDetected} · Removed ${res.removedNonSlips} non-slips`;
        await refreshPeriodData();
        activeTab = "home";
        celebrateMascot("Slips refreshed!", "ประมวลผลสลิปเรียบร้อย!");
        setTimeout(() => (scanBanner = null), 5000);
      }}
      onOpenRules={async () => {
        payeeRules = await api.listPayeeRules();
        showRulesModal = true;
      }}
      onCreateCategory={async (input) => {
        await api.createCategory(input);
        categories = await api.getCategories();
        celebrateMascot("New category added!", "เพิ่มหมวดหมู่ใหม่แล้ว!");
      }}
      onDeleteCategory={async (id) => {
        await api.deleteCategory(id);
        categories = await api.getCategories();
        await refreshPeriodData();
      }}
      onCreateTag={async (name) => {
        await api.createTag(name);
        tags = await api.getTags();
      }}
      onToggleTag={async (id, disabled) => {
        await api.toggleTagDisabled(id, disabled);
        tags = await api.getTags();
      }}
      onExportCsv={async () => {
        const csv = await api.exportRecordsCsv();
        triggerAndroidDownloadOrShare("openjot-records.csv", "text/csv", csv);
        track("data_exported", { format: "csv" });
      }}
      onExportJson={async () => {
        const json = await api.exportBackupJson();
        triggerAndroidDownloadOrShare("openjot-backup.json", "application/json", json);
        track("data_exported", { format: "json" });
      }}
    />
  {/if}

  <!-- Bottom Navigation Bar -->
  {#if undoDelete}
    <div
      class="fixed inset-x-4 z-40 flex items-center justify-between gap-3 rounded-2xl bg-[var(--text-primary)] px-4 py-3 text-[var(--bg-canvas)] shadow-xl"
      style="bottom: calc(env(safe-area-inset-bottom) + 84px);"
      role="status"
    >
      <span class="text-sm font-semibold">{t(lang, "recordDeleted")}</span>
      <button
        type="button"
        class="text-sm font-extrabold text-[var(--inverse-accent)]"
        onclick={undoSwipeDelete}
      >
        {t(lang, "undo")}
      </button>
    </div>
  {/if}

  {#if showWhatsNew && whatsNewLaunch?.length}
    <ThumbSheet
      title={t(lang, "whatsNewTitle").replace("{version}", appVersion ?? "")}
      labelId="whats-new-title"
      closeLabel={t(lang, "close")}
      close={whatsNewSheet}
      onClose={closeWhatsNew}
    >
      {#snippet hero()}
        <div class="mb-1 flex justify-center">
          <MooMascot mood="happy" size="md" interactive={false} alt="" />
        </div>
      {/snippet}
      <WhatsNewItems
        releases={whatsNewLaunch}
        {lang}
        showVersions={whatsNewLaunch.length > 1}
        onAction={whatsNewAction}
        appLockAvailable={hasAndroidBridge()}
        reminderAvailable={hasAndroidBridge()}
      />
      {#snippet footer()}
        <button
          type="button"
          onclick={() => whatsNewSheet.current?.()}
          class="w-full rounded-xl bg-[var(--brand)] py-2.5 text-sm font-extrabold text-[var(--brand-contrast)] active:bg-[var(--brand-deep)]"
        >
          {t(lang, "whatsNewGotIt")}
        </button>
      {/snippet}
    </ThumbSheet>
  {/if}

  {#if monthPicker}
    <ThumbSheet
      title={lang === "th" ? "ไปที่เดือน" : "Go to month"}
      labelId="month-sheet-title"
      closeLabel={t(lang, "close")}
      close={monthSheet}
      onClose={() => (monthPicker = false)}
    >
      <div class="flex flex-col gap-2">
        {#each monthPickerOffsets() as offset (offset)}
          <button
            type="button"
            aria-current={offset === periodOffset ? "date" : undefined}
            class="rounded-xl py-2.5 text-sm font-bold {offset === 0
              ? 'border border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-contrast)]'
              : offset === periodOffset
                ? 'border border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-text)]'
                : 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)]'}"
            onclick={() => goToPeriod(offset)}
          >
            {monthLabel(offset)}
            {#if offset === 0}
              <span class="ml-1 text-xs font-semibold opacity-90">· {t(lang, "thisMonth")}</span>
            {/if}
          </button>
        {/each}
      </div>
    </ThumbSheet>
  {/if}

  {#if scanStartPrompt}
    <ThumbSheet
      title={t(lang, "scanFrom")}
      labelId="scan-sheet-title"
      closeLabel={t(lang, "close")}
      close={scanSheet}
      onClose={() => (scanStartPrompt = false)}
    >
      <p class="text-xs text-[var(--text-muted)]">
        {lang === "th"
          ? "แตะเดือนแรกที่จะรวม สลิปที่สแกนแล้วจะถูกข้าม"
          : "Tap the first month to include. Slips already scanned are skipped."}
      </p>
      <div class="mt-4 flex flex-col gap-2">
        <button
          type="button"
          class="rounded-xl bg-[var(--brand)] py-2.5 text-sm font-bold text-[var(--brand-contrast)]"
          onclick={() => startSlipScan(monthStartSec(periodOffset))}
        >
          {home?.period.label ?? monthLabel(periodOffset)}
        </button>
        <button
          type="button"
          class="rounded-xl border border-[var(--border-subtle)] py-2.5 text-sm font-bold text-[var(--text-primary)]"
          onclick={() => startSlipScan(monthStartSec(periodOffset - 3))}
        >
          {lang === "th"
            ? `3 เดือนจาก ${monthLabel(periodOffset)}`
            : `3 months from ${monthLabel(periodOffset)}`}
        </button>
        <button
          type="button"
          class="rounded-xl border border-[var(--border-subtle)] py-2.5 text-sm font-bold text-[var(--text-primary)]"
          onclick={() => startSlipScan(monthStartSec(periodOffset - 12))}
        >
          {lang === "th"
            ? `1 ปีจาก ${monthLabel(periodOffset)}`
            : `1 year from ${monthLabel(periodOffset)}`}
        </button>
      </div>
      <div class="mt-4">
        <div class="text-xs font-bold text-[var(--text-primary)]">
          {lang === "th" ? "สแกนแล้ว" : "Already scanned"}
        </div>
        {#if scannedMonths.length === 0}
          <p class="mt-1 text-xs text-[var(--text-muted)]">
            {lang === "th" ? "ยังไม่มี" : "None yet"}
          </p>
        {:else}
          <div class="mt-2 flex flex-wrap gap-1.5">
            {#each scannedMonths as key (key)}
              <span class="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--brand-text)]">
                {formatMonthKey(key)}
              </span>
            {/each}
          </div>
        {/if}
      </div>
    </ThumbSheet>
  {/if}

  {#if pdfPrompt}
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
      <form
        class="w-full max-w-md rounded-3xl bg-[var(--bg-card)] p-5 shadow-xl"
        onsubmit={(event) => {
          event.preventDefault();
          if (!pdfPrompt || pdfBusy) return;
          void importPdfBase64(pdfPrompt.pdfBase64, pdfPassword);
        }}
      >
        <h2 class="text-base font-extrabold text-[var(--text-primary)]">{t(lang, "statementPassword")}</h2>
        <p class="mt-1 text-xs text-[var(--text-muted)]">{t(lang, "statementPasswordHint")}</p>
        {#if pdfPrompt.wrong}
          <p class="mt-2 text-xs font-semibold text-rose-500">{t(lang, "wrongPassword")}</p>
        {/if}
        <input
          type="password"
          autocomplete="off"
          bind:value={pdfPassword}
          class="mt-4 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
        />
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-xl border border-[var(--border-subtle)] py-2.5 text-sm font-bold text-[var(--text-secondary)]"
            onclick={() => {
              pdfPrompt = null;
              pdfPassword = "";
            }}
          >
            {t(lang, "cancel")}
          </button>
          <button
            type="submit"
            class="flex-1 rounded-xl bg-[var(--brand)] py-2.5 text-sm font-bold text-[var(--brand-contrast)] disabled:opacity-60"
            disabled={pdfBusy || pdfPassword.trim() === ""}
          >
            {t(lang, "confirm")}
          </button>
        </div>
      </form>
    </div>
  {/if}

  <nav
    class="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-md border-t border-[var(--border-subtle)] grid grid-cols-3 pt-2"
    style="background-color: var(--nav-bg); padding-bottom: max(env(safe-area-inset-bottom), 20px);"
  >
    <button
      type="button"
      onclick={() => (activeTab = "home")}
      class="flex flex-col items-center gap-0.5 text-[11px] font-bold {activeTab === 'home'
        ? 'text-[var(--nav-active)]'
        : 'text-[var(--text-muted)]'}"
    >
      <Home class="size-5" />
      <span>{t(lang, "home")}</span>
    </button>
    <button
      type="button"
      onclick={() => (activeTab = "summary")}
      class="flex flex-col items-center gap-0.5 text-[11px] font-bold {activeTab === 'summary'
        ? 'text-[var(--nav-active)]'
        : 'text-[var(--text-muted)]'}"
    >
      <PieChart class="size-5" />
      <span>{t(lang, "summary")}</span>
    </button>
    <button
      type="button"
      onclick={() => {
        settingsSubPage = null;
        activeTab = "settings";
      }}
      class="flex flex-col items-center gap-0.5 text-[11px] font-bold {activeTab === 'settings'
        ? 'text-[var(--nav-active)]'
        : 'text-[var(--text-muted)]'}"
    >
      <User class="size-5" />
      <span>{t(lang, "myMoo")}</span>
    </button>
  </nav>

  <!-- Add / Edit Record Modal -->
  {#if showRecordSheet}
    <RecordSheet
      {lang}
      {accounts}
      {categories}
      {tags}
      editing={editingRecord}
      bind:showLightbox={recordLightboxOpen}
      onSave={handleSaveRecord}
      onDelete={handleDeleteRecord}
      onClose={() => {
        showRecordSheet = false;
        recordLightboxOpen = false;
        editingRecord = null;
      }}
    />
  {/if}

  <!-- Auto-Categorize Rules Modal -->
  {#if showRulesModal}
    <RulesModal
      {lang}
      {categories}
      rules={payeeRules}
      onAddRule={async (pattern, categoryId) => {
        await api.upsertPayeeRule(pattern, categoryId);
        payeeRules = await api.listPayeeRules();
      }}
      onDeleteRule={async (id) => {
        await api.deletePayeeRule(id);
        payeeRules = await api.listPayeeRules();
      }}
      onApplyAll={async () => {
        const count = await api.autoCategorizeUncategorized();
        await refreshPeriodData();
        celebrateMascot(`Auto-categorized ${count} record(s)!`, `จัดหมวดอัตโนมัติไป ${count} รายการ!`);
        return count;
      }}
      onClose={() => (showRulesModal = false)}
    />
  {/if}

  <!-- Search Full-Screen Overlay -->
  {#if showSearch}
    <div class="fixed inset-0 z-50 bg-[var(--bg-canvas)] flex flex-col overscroll-contain">
      <div
        class="{theme === 'trajectonomics' ? 'bg-[var(--hero-from)]' : 'bg-[var(--brand)]'} px-3 pb-3 flex items-center gap-2 shrink-0"
        style="padding-top: max(env(safe-area-inset-top), 36px);"
      >
        <button
          type="button"
          onclick={() => (showSearch = false)}
          class="size-9 rounded-full flex items-center justify-center text-white active:bg-black/15"
          aria-label={t(lang, "back")}
        >
          <ChevronLeft class="size-6" />
        </button>
        <input
          type="text"
          value={searchQuery}
          oninput={(e) => runSearch(e.currentTarget.value)}
          placeholder={t(lang, "searchPlaceholder")}
          class="flex-1 rounded-full bg-white text-[#18181b] placeholder:text-zinc-500 px-4 py-2 text-sm outline-none"
        />
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-2">
        {#if searchQuery.trim() && searchResults.length === 0}
          <p class="text-center text-sm text-[var(--text-muted)] py-10">{t(lang, "noResults")}</p>
        {:else}
          {#each searchResults as rec}
            {@const cat = categoryMeta(rec.categoryId)}
            <button
              type="button"
              onclick={() => {
                showSearch = false;
                editingRecord = rec;
                recordLightboxOpen = false;
                showRecordSheet = true;
              }}
              class="w-full flex items-center justify-between rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] px-4 py-3 text-left"
            >
              <div class="flex items-center gap-3 min-w-0">
                <CategoryIcon icon={cat?.icon ?? "leaf"} color={cat?.color ?? "#71717a"} size="sm" />
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {rec.payeeRaw || rec.note || (cat ? (lang === "th" ? cat.nameTh : cat.nameEn) : rec.kind)}
                  </div>
                  <div class="text-xs text-[var(--text-muted)]">{rec.localDate}</div>
                </div>
              </div>
              <div class="text-sm font-bold text-[var(--text-primary)]">{formatBaht(rec.amountSatang, true)}</div>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

  {#if showFilterSheet}
    <ThumbSheet
      title={t(lang, "filterRecords")}
      labelId="filter-sheet-title"
      closeLabel={t(lang, "close")}
      close={filterSheet}
      onClose={() => (showFilterSheet = false)}
    >
      {#snippet actions()}
        <button
          type="button"
          onclick={async () => {
            filterAccountIds = [];
            await refreshPeriodData();
            filterSheet.current?.();
          }}
          class="text-sm font-bold text-[var(--brand)]"
        >
          {t(lang, "reset")}
        </button>
      {/snippet}
      <div class="space-y-1">
        {#each accounts as acc}
          {@const checked = filterAccountIds.includes(acc.id)}
          <label class="flex items-center justify-between py-2">
            <div class="flex items-center gap-3">
              <span class="size-4 rounded-full" style="background-color: {acc.color};"></span>
              <span class="text-sm font-medium text-[var(--text-primary)]">
                {lang === "th" ? acc.nameTh : acc.nameEn}
              </span>
            </div>
            <input
              type="checkbox"
              {checked}
              onchange={() => {
                if (checked) {
                  filterAccountIds = filterAccountIds.filter((x) => x !== acc.id);
                } else {
                  filterAccountIds = [...filterAccountIds, acc.id];
                }
              }}
              class="size-5 accent-[var(--brand)]"
            />
          </label>
        {/each}
      </div>
      {#snippet footer()}
        <button
          type="button"
          onclick={async () => {
            await refreshPeriodData();
            filterSheet.current?.();
          }}
          class="w-full rounded-full bg-[var(--brand)] py-3 text-sm font-bold text-[var(--brand-contrast)] active:bg-[var(--brand-deep)]"
        >
          {t(lang, "apply")}
        </button>
      {/snippet}
    </ThumbSheet>
  {/if}
</div>

{#if showOnboarding}
  <Onboarding
    {settings}
    {theme}
    {hand}
    initialLanguage={onboardingLanguage}
    replay={onboardingReplay}
    {shareStats}
    onChangeShareStats={(on) => changeShareStats(on, "onboarding")}
    bind:backHandler={onboardingBack}
    onChangeTheme={(next) => (theme = next)}
    onChangeHand={(next) => (hand = next)}
    onSaveSettings={async (draft) => {
      const next = withReminder(withAppLock(draft));
      await api.updateSettings(next);
      settings = next;
      await refreshPeriodData();
    }}
    onFinish={closeOnboarding}
  />
{/if}

{#if lockState === "checking"}
  <!-- Reading the lock setting: a plain cover, so nothing shows before a possible prompt. -->
  <div class="fixed inset-0 z-[200] bg-[var(--bg-canvas)]" aria-hidden="true"></div>
{:else if lockState !== "open"}
  <LockScreen {lang} busy={unlocking} message={lockMessage} onUnlock={unlockApp} />
{/if}
