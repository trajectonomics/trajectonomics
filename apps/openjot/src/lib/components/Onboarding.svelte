<script lang="ts">
  // First-run welcome tour: a few swipeable steps with Moo, light setup that
  // writes through the existing settings/theme/hand handlers, and an optional
  // gallery permission prompt. Skippable at every step.
  import { onMount, tick, untrack } from "svelte";
  import {
    ArrowDown,
    Check,
    ChevronLeft,
    ChevronRight,
    Download,
    Globe,
    Hand,
    Images,
    Minus,
    Palette,
    Plus,
    Calendar,
    ChartNoAxesColumn,
    ShieldCheck,
    UserRoundX,
    WifiOff,
  } from "@lucide/svelte";
  import MooMascot from "./MooMascot.svelte";
  import { hasAndroidBridge } from "$lib/api";
  import { FIRST_SCAN_MONTHS } from "$lib/onboarding";
  import { track } from "$lib/analytics";
  import { t, type I18nKey } from "$lib/i18n";
  import type { AppTheme, HandMode } from "$lib/theme";
  import type { AppSettings } from "$lib/types";

  let {
    settings,
    theme,
    hand,
    initialLanguage,
    replay = false,
    shareStats = false,
    onChangeTheme,
    onChangeHand,
    onChangeShareStats,
    onSaveSettings,
    onFinish,
    backHandler = $bindable<(() => void) | null>(null),
  }: {
    settings: AppSettings;
    theme: AppTheme;
    hand: HandMode;
    /** Language to show first (the device language on a first run). */
    initialLanguage: "en" | "th";
    /** Opened again from My Moo rather than on a first run. */
    replay?: boolean;
    /** Anonymous usage stats switch (opt-in, off by default), shown on the "private" step. */
    shareStats?: boolean;
    onChangeTheme: (next: AppTheme) => void;
    onChangeHand: (next: HandMode) => void;
    onChangeShareStats: (on: boolean) => void;
    onSaveSettings: (next: AppSettings) => Promise<void>;
    onFinish: () => void;
    /** Set by this component: what the Android back button should do. */
    backHandler?: (() => void) | null;
  } = $props();

  const STEPS = ["welcome", "private", "scan", "setup", "permission", "done"] as const;
  const LAST = STEPS.length - 1;
  const SWIPE_MIN = 48;

  let step = $state(0);
  let monthStart = $state(untrack(() => settings.monthStartDay));
  let lang = $state<"en" | "th">(untrack(() => initialLanguage));
  let galleryGranted = $state(false);
  const onAndroid = hasAndroidBridge();
  let headings: (HTMLElement | null)[] = $state([]);
  let monthTimer: ReturnType<typeof setTimeout> | null = null;
  let saveChain: Promise<void> = Promise.resolve();

  // Swipe tracking
  let dragStart: { x: number; y: number; id: number } | null = null;
  let dragX = $state(0);
  let dragging = $state(false);
  let suppressClick = false;
  let suppressTimer: ReturnType<typeof setTimeout> | null = null;

  const tr = (key: I18nKey, vars: Record<string, number> = {}) =>
    Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), t(lang, key));

  function save(patch: Partial<AppSettings>) {
    // Serialize writes and build each one from the latest saved settings, so a
    // slow save can't land after (or clobber) a newer one.
    saveChain = saveChain
      .then(() => {
        const cur = settings;
        const keys = Object.keys(patch) as (keyof AppSettings)[];
        if (keys.every((k) => cur[k] === patch[k])) return;
        return onSaveSettings({ ...cur, ownerNames: [...cur.ownerNames], ...patch });
      })
      .catch((e) => {
        console.warn("onboarding: could not save settings", e);
      });
    return saveChain;
  }

  function setLanguage(next: "en" | "th") {
    lang = next;
    void save({ language: next });
  }

  function setMonthStart(next: number) {
    monthStart = Math.min(28, Math.max(1, next));
    if (monthTimer) clearTimeout(monthTimer);
    monthTimer = setTimeout(flushMonthStart, 350);
  }

  function flushMonthStart() {
    if (monthTimer) clearTimeout(monthTimer);
    monthTimer = null;
    void save({ monthStartDay: monthStart });
  }

  async function finish() {
    track("onboarding_finished", { completed: step === LAST, last_step: STEPS[step], replay });
    if (monthTimer) flushMonthStart();
    // Keep the language the tour was shown in (the device language on a first run).
    await save({ language: lang });
    onFinish();
  }

  async function goTo(next: number) {
    const target = Math.min(LAST, Math.max(0, next));
    if (target === step) return;
    step = target;
    stepViewed(target);
    await tick();
    headings[target]?.focus({ preventScroll: true });
  }

  function stepViewed(index: number) {
    track("onboarding_step_viewed", { step: STEPS[index], step_number: index + 1, replay });
  }

  function requestGallery() {
    window.MooJotAndroid?.requestGalleryPermission();
  }

  function onKeydown(e: KeyboardEvent) {
    const el = e.target as HTMLElement | null;
    if (el?.closest("input, select, textarea")) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      void goTo(step + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      void goTo(step - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      void finish();
    }
  }

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dragX = 0;
    suppressClick = false;
    if (suppressTimer) clearTimeout(suppressTimer);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragStart || e.pointerId !== dragStart.id) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    if (!dragging) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) {
        if (Math.abs(dy) > 10) dragStart = null; // vertical scroll wins
        return;
      }
      dragging = true;
      // Keep getting move/up events if the finger or mouse leaves the slides.
      // Captured only once a swipe starts, so a plain tap still reaches its button.
      try {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      } catch {
        // pointer already gone
      }
    }
    // Resist at the ends.
    const atEdge = (step === 0 && dx > 0) || (step === LAST && dx < 0);
    dragX = atEdge ? dx / 3 : dx;
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragStart || e.pointerId !== dragStart.id) return;
    const dx = dragX;
    const wasDragging = dragging;
    dragStart = null;
    dragging = false;
    dragX = 0;
    if (!wasDragging) return;
    // A swipe that ends on a button is not a tap. Some swipes produce no click at all,
    // so don't leave the guard armed for a later keyboard or assistive activation.
    suppressClick = true;
    if (suppressTimer) clearTimeout(suppressTimer);
    suppressTimer = setTimeout(() => (suppressClick = false), 400);
    if (dx <= -SWIPE_MIN) void goTo(step + 1);
    else if (dx >= SWIPE_MIN) void goTo(step - 1);
  }

  function onPointerCancel() {
    dragStart = null;
    dragging = false;
    dragX = 0;
  }

  onMount(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    headings[0]?.focus({ preventScroll: true });
    track("onboarding_started", { replay });
    stepViewed(0);
    if (onAndroid) galleryGranted = Boolean(window.MooJotAndroid?.hasGalleryPermission());
    const onPerm = (ev: Event) => {
      const detail = (ev as CustomEvent<{ granted: boolean }>).detail;
      if (detail) galleryGranted = Boolean(detail.granted);
    };
    window.addEventListener("moojot:permission", onPerm);
    // Save the language the tour opens in right away, so a tour resumed after the app
    // was closed comes back in the same language.
    if (settings.language !== lang) void save({ language: lang });
    backHandler = () => {
      if (step > 0) void goTo(step - 1);
      else void finish();
    };
    return () => {
      window.removeEventListener("moojot:permission", onPerm);
      if (monthTimer) clearTimeout(monthTimer);
      if (suppressTimer) clearTimeout(suppressTimer);
      backHandler = null;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  });

  const optionClass = (active: boolean) =>
    `flex-1 min-h-11 rounded-2xl px-3 py-2.5 text-xs font-bold border transition-colors ${
      active
        ? "bg-[var(--brand)] text-[var(--brand-contrast)] border-[var(--brand)]"
        : "bg-[var(--bg-input)] text-[var(--text-primary)] border-[var(--border-subtle)]"
    }`;
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="fixed inset-0 z-[70] flex flex-col overscroll-contain bg-[var(--bg-canvas)] text-[var(--text-primary)]"
  role="dialog"
  aria-modal="true"
  aria-labelledby="onb-title-{step}"
  tabindex="-1"
  onkeydown={onKeydown}
>
  <!-- Top bar: progress + skip -->
  <div
    class="flex shrink-0 items-center justify-between gap-3 px-4 pb-2"
    style="padding-top: max(env(safe-area-inset-top), 16px);"
  >
    <nav aria-label={tr("onbStepOf", { n: step + 1, total: STEPS.length })} class="flex items-center gap-1.5">
      {#each STEPS as id, i (id)}
        <button
          type="button"
          onclick={() => goTo(i)}
          aria-label={tr("onbGoToStep", { n: i + 1 })}
          aria-current={i === step ? "step" : undefined}
          class="flex size-6 items-center justify-center"
        >
          <span
            class="block h-2 rounded-full transition-all duration-300 motion-reduce:transition-none {i === step
              ? 'w-6 bg-[var(--brand)]'
              : i < step
                ? 'w-2 bg-[var(--brand-border)]'
                : 'w-2 bg-[var(--track-muted)]'}"
          ></span>
        </button>
      {/each}
    </nav>
    {#if step < LAST}
      <button
        type="button"
        onclick={finish}
        class="min-h-10 rounded-full px-4 text-sm font-bold text-[var(--text-muted)] active:bg-[var(--brand-soft)]"
      >
        {tr("onbSkip")}
      </button>
    {/if}
  </div>

  <!-- Slides -->
  <div
    class="relative min-h-0 flex-1 overflow-hidden"
    style="touch-action: pan-y;"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerCancel}
    onlostpointercapture={(e) => {
      if (dragStart && e.pointerId === dragStart.id && dragging) onPointerCancel();
    }}
    onclickcapture={(e) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    }}
    role="presentation"
  >
    <div
      class="flex h-full {dragging ? '' : 'transition-transform duration-300 ease-out motion-reduce:transition-none'}"
      style="transform: translateX(calc({-step * 100}% + {dragX}px));"
    >
      {#each STEPS as id, i (id)}
        <section
          class="h-full w-full shrink-0 overflow-y-auto px-6 pb-4"
          inert={i !== step}
          aria-hidden={i !== step}
        >
          <div class="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-5 py-4 text-center">
            {#if id === "welcome"}
              <div class="relative">
                <div class="absolute inset-4 rounded-full bg-[var(--brand-soft)] blur-xl"></div>
                <div class="relative motion-safe:animate-[moo-bob_3s_ease-in-out_infinite]">
                  <MooMascot mood="idle" size="lg" alt={theme === "trajectonomics" ? "OpenJot mascot" : "Moo"} />
                </div>
              </div>
              <h2 id="onb-title-{i}" bind:this={headings[i]} tabindex="-1" class="text-3xl font-extrabold tracking-tight outline-none">
                {tr(theme === "trajectonomics" ? "onbWelcomeTitleRobot" : "onbWelcomeTitle")}
              </h2>
              <p class="max-w-xs text-base leading-relaxed text-[var(--text-secondary)]">{tr("onbWelcomeBody")}</p>
              <!-- Language comes first, so the rest of the tour is in the language people read (#48). -->
              <fieldset class="w-full max-w-xs rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-left shadow-xs">
                <legend class="sr-only">{t(lang, "language")}</legend>
                <div class="mb-2.5 flex items-center gap-2 text-sm font-bold" aria-hidden="true">
                  <Globe class="size-4 text-[var(--brand)]" />{t(lang, "language")}
                </div>
                <div class="flex gap-2">
                  <button type="button" aria-pressed={lang === "th"} onclick={() => setLanguage("th")} class={optionClass(lang === "th")}>ภาษาไทย</button>
                  <button type="button" aria-pressed={lang === "en"} onclick={() => setLanguage("en")} class={optionClass(lang === "en")}>English</button>
                </div>
              </fieldset>
            {:else if id === "private"}
              <span class="flex size-24 items-center justify-center rounded-[2rem] bg-[var(--brand-soft)] text-[var(--brand)]">
                <ShieldCheck class="size-12" strokeWidth={1.8} />
              </span>
              <h2 id="onb-title-{i}" bind:this={headings[i]} tabindex="-1" class="text-2xl font-extrabold tracking-tight outline-none">
                {tr("onbPrivateTitle")}
              </h2>
              <p class="max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">{tr("onbPrivateBody")}</p>
              <ul class="w-full space-y-2 text-left">
                {#each [{ Icon: UserRoundX, key: "onbPrivatePoint1" }, { Icon: WifiOff, key: "onbPrivatePoint2" }, { Icon: Download, key: "onbPrivatePoint3" }] as point (point.key)}
                  <li class="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 shadow-xs">
                    <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      <point.Icon class="size-4" />
                    </span>
                    <span class="text-sm font-semibold">{tr(point.key as I18nKey)}</span>
                  </li>
                {/each}
              </ul>
              <label class="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 text-left shadow-xs">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                  <ChartNoAxesColumn class="size-4" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block text-sm font-semibold">{tr("shareStats")}</span>
                  <span class="block text-[11px] text-[var(--text-muted)]">{tr("onbStatsHint")}</span>
                </span>
                <input
                  type="checkbox"
                  checked={shareStats}
                  onchange={(e) => onChangeShareStats(e.currentTarget.checked)}
                  class="size-5 shrink-0 accent-[var(--brand)]"
                />
              </label>
            {:else if id === "scan"}
              <div class="relative w-full max-w-[16rem] rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-sm">
                <div
                  class="flex flex-col items-center gap-1 rounded-2xl py-3 text-white"
                  style="background: linear-gradient(135deg, var(--hero-from), var(--hero-to)); outline: 1px solid var(--hero-border); outline-offset: -1px;"
                >
                  <ArrowDown class="size-5 motion-safe:animate-bounce" />
                  <MooMascot mood="scan" size="md" interactive={false} alt="" />
                </div>
                <div class="mt-3 space-y-2" aria-hidden="true">
                  <div class="h-3 w-3/4 rounded-full bg-[var(--track-muted)]"></div>
                  <div class="h-3 w-1/2 rounded-full bg-[var(--track-muted)]"></div>
                </div>
                <span
                  class="absolute -bottom-4 right-4 flex size-11 items-center justify-center rounded-full bg-[var(--brand)] text-[var(--brand-contrast)] shadow-lg"
                  aria-hidden="true"
                >
                  <Plus class="size-5" />
                </span>
              </div>
              <h2 id="onb-title-{i}" bind:this={headings[i]} tabindex="-1" class="mt-2 text-2xl font-extrabold tracking-tight outline-none">
                {tr("onbScanTitle")}
              </h2>
              <p class="max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">{tr("onbScanBody")}</p>
              <ul class="w-full space-y-2 text-left">
                {#each [{ Icon: ArrowDown, key: "onbScanPoint1" }, { Icon: Plus, key: "onbScanPoint2" }] as point (point.key)}
                  <li class="flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 shadow-xs">
                    <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      <point.Icon class="size-4" />
                    </span>
                    <span class="text-sm font-semibold">{tr(point.key as I18nKey)}</span>
                  </li>
                {/each}
              </ul>
            {:else if id === "setup"}
              <div class="flex items-center gap-3">
                <MooMascot mood="idle" size="sm" interactive={false} alt="" />
                <div class="text-left">
                  <h2 id="onb-title-{i}" bind:this={headings[i]} tabindex="-1" class="text-2xl font-extrabold tracking-tight outline-none">
                    {tr("onbSetupTitle")}
                  </h2>
                  <p class="text-xs text-[var(--text-muted)]">{tr("onbSetupBody")}</p>
                </div>
              </div>
              <div class="w-full space-y-3 text-left">
                <fieldset class="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xs">
                  <legend class="sr-only">{tr("onbTheme")}</legend>
                  <div class="mb-2.5 flex items-center gap-2 text-sm font-bold" aria-hidden="true">
                    <Palette class="size-4 text-[var(--brand)]" />{tr("onbTheme")}
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    {#each [{ id: "trajectonomics", key: "onbThemeTrajectonomics", descKey: "themeDefault", a: "#EA580C", b: "#0A0A0A" }, { id: "pink-white", key: "onbThemePink", descKey: "themeLightMode", a: "#FF4D94", b: "#ffffff" }, { id: "orange-black", key: "onbThemeOrange", descKey: "themeDarkMode", a: "#FF6B1A", b: "#0a0a0c" }] as opt (opt.id)}
                      <button
                        type="button"
                        aria-pressed={theme === opt.id}
                        onclick={() => onChangeTheme(opt.id as AppTheme)}
                        class="flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-[10px] font-bold text-[var(--text-primary)] transition-colors {theme === opt.id
                          ? 'border-[var(--brand)] bg-[var(--brand-soft)] ring-1 ring-[var(--brand)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-input)]'}"
                      >
                        <span class="flex -space-x-1.5" aria-hidden="true">
                          <span class="size-4 rounded-full ring-2 ring-white/80" style="background: {opt.a};"></span>
                          <span class="size-4 rounded-full ring-2 ring-zinc-400/60" style="background: {opt.b};"></span>
                        </span>
                        <span>{tr(opt.key as I18nKey)}</span>
                        <span class="text-[9px] font-medium text-[var(--text-muted)]">{tr(opt.descKey as I18nKey)}</span>
                      </button>
                    {/each}
                  </div>
                </fieldset>

                <fieldset class="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xs">
                  <legend class="sr-only">{tr("onbHand")}</legend>
                  <div class="flex items-center gap-2 text-sm font-bold" aria-hidden="true">
                    <Hand class="size-4 text-[var(--brand)]" />{tr("onbHand")}
                  </div>
                  <p class="mb-2.5 mt-0.5 text-[11px] text-[var(--text-muted)]">{tr("onbHandHint")}</p>
                  <div class="flex gap-2">
                    <button type="button" aria-pressed={hand === "left"} onclick={() => onChangeHand("left")} class={optionClass(hand === "left")}>{tr("onbHandLeft")}</button>
                    <button type="button" aria-pressed={hand === "right"} onclick={() => onChangeHand("right")} class={optionClass(hand === "right")}>{tr("onbHandRight")}</button>
                  </div>
                </fieldset>

                <div class="flex items-center gap-3 rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-xs">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 text-sm font-bold" id="onb-month-label">
                      <Calendar class="size-4 text-[var(--brand)]" />{t(lang, "monthStartDay")}
                    </div>
                    <p class="mt-0.5 text-[11px] text-[var(--text-muted)]">{tr("onbMonthStartHint")}</p>
                  </div>
                  <div class="flex shrink-0 items-center gap-1" role="group" aria-labelledby="onb-month-label">
                    <button
                      type="button"
                      onclick={() => setMonthStart(monthStart - 1)}
                      disabled={monthStart <= 1}
                      aria-label={tr("onbDecrease")}
                      class="flex size-10 items-center justify-center rounded-full bg-[var(--bg-input)] border border-[var(--border-subtle)] disabled:opacity-40"
                    >
                      <Minus class="size-4" />
                    </button>
                    <output class="w-9 text-center text-lg font-extrabold tabular-nums" aria-live="polite">{monthStart}</output>
                    <button
                      type="button"
                      onclick={() => setMonthStart(monthStart + 1)}
                      disabled={monthStart >= 28}
                      aria-label={tr("onbIncrease")}
                      class="flex size-10 items-center justify-center rounded-full bg-[var(--bg-input)] border border-[var(--border-subtle)] disabled:opacity-40"
                    >
                      <Plus class="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            {:else if id === "permission"}
              <span class="relative flex size-24 items-center justify-center rounded-[2rem] bg-[var(--brand-soft)] text-[var(--brand)]">
                <Images class="size-12" strokeWidth={1.8} />
                {#if galleryGranted}
                  <span class="absolute -right-1 -top-1 flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                    <Check class="size-5" />
                  </span>
                {/if}
              </span>
              <h2 id="onb-title-{i}" bind:this={headings[i]} tabindex="-1" class="text-2xl font-extrabold tracking-tight outline-none">
                {tr("onbPermTitle")}
              </h2>
              <p class="max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">{tr("onbPermBody")}</p>
              {#if !onAndroid}
                <p class="w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {tr("onbPermWeb")}
                </p>
              {:else if galleryGranted}
                <p class="flex items-center gap-2 rounded-full bg-emerald-500/12 px-4 py-2 text-sm font-bold text-emerald-600" role="status">
                  <Check class="size-4" />{tr("onbPermGranted")}
                </p>
              {:else}
                <button
                  type="button"
                  onclick={requestGallery}
                  class="w-full max-w-xs rounded-full bg-[var(--brand)] py-3.5 text-sm font-bold text-[var(--brand-contrast)] shadow-sm active:bg-[var(--brand-deep)]"
                >
                  {tr("onbPermAllow")}
                </button>
                <p class="max-w-xs text-xs text-[var(--text-muted)]">{tr("onbPermLater")}</p>
              {/if}
            {:else}
              <div class="relative">
                <span class="absolute -left-6 top-2 text-2xl motion-safe:animate-[moo-twinkle_1.6s_ease-in-out_infinite]" aria-hidden="true">✨</span>
                <span class="absolute -right-5 top-10 text-xl motion-safe:animate-[moo-twinkle_1.6s_ease-in-out_0.5s_infinite]" aria-hidden="true">🎉</span>
                <span class="absolute -left-2 bottom-3 text-lg motion-safe:animate-[moo-twinkle_1.6s_ease-in-out_1s_infinite]" aria-hidden="true">💖</span>
                <MooMascot mood="happy" size="lg" alt={theme === "trajectonomics" ? "OpenJot mascot" : "Moo"} />
              </div>
              <h2 id="onb-title-{i}" bind:this={headings[i]} tabindex="-1" class="text-3xl font-extrabold tracking-tight outline-none">
                {tr("onbDoneTitle")}
              </h2>
              <p class="max-w-xs text-base leading-relaxed text-[var(--text-secondary)]">{tr("onbDoneBody")}</p>
              {#if onAndroid && galleryGranted && !replay}
                <p class="flex max-w-xs items-start gap-2 rounded-2xl bg-[var(--brand-soft)] px-4 py-3 text-left text-sm font-semibold text-[var(--brand-text)]">
                  <Images class="mt-0.5 size-4 shrink-0" />{tr("onbDoneScan", { n: FIRST_SCAN_MONTHS })}
                </p>
              {/if}
            {/if}
          </div>
        </section>
      {/each}
    </div>
  </div>

  <!-- Bottom actions -->
  <div
    class="flex shrink-0 items-center gap-3 px-5 pt-2"
    style="padding-bottom: max(env(safe-area-inset-bottom), 20px);"
  >
    {#if step === LAST}
      <button
        type="button"
        onclick={finish}
        class="w-full rounded-full bg-[var(--brand)] py-4 text-base font-extrabold text-[var(--brand-contrast)] shadow-lg active:bg-[var(--brand-deep)]"
        style="box-shadow: 0 10px 24px -8px var(--hero-shadow);"
      >
        {tr("onbStart")}
      </button>
    {:else}
      <button
        type="button"
        onclick={() => goTo(step - 1)}
        disabled={step === 0}
        class="flex min-h-12 items-center gap-1 rounded-full px-4 text-sm font-bold text-[var(--text-secondary)] active:bg-[var(--brand-soft)] disabled:invisible"
      >
        <ChevronLeft class="size-4" />{t(lang, "back")}
      </button>
      <button
        type="button"
        onclick={() => goTo(step + 1)}
        class="ml-auto flex min-h-12 items-center gap-1 rounded-full bg-[var(--brand)] px-7 text-sm font-bold text-[var(--brand-contrast)] shadow-sm active:bg-[var(--brand-deep)]"
      >
        {t(lang, "next")}<ChevronRight class="size-4" />
      </button>
    {/if}
  </div>
</div>
