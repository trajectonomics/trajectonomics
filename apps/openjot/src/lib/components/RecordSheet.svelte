<script lang="ts">
  import { untrack } from "svelte";
  import {
    X,
    Calendar,
    ClipboardPaste,
    Delete,
    Check,
    Trash2,
    Repeat,
    Tag as TagIcon,
    FileText,
    Building2,
    ChevronDown,
    Image as ImageIcon,
    Maximize2,
  } from "@lucide/svelte";
  import CategoryIcon from "./CategoryIcon.svelte";
  import SlipLightbox from "./SlipLightbox.svelte";
  import { evalCalcExpression, formatBaht, todayYmd } from "$lib/format";
  import { t } from "$lib/i18n";
  import { activeTheme } from "$lib/themeStore";
  import type {
    Account,
    Category,
    RecordInput,
    RecordItem,
    RecordKind,
    Tag,
  } from "$lib/types";

  let {
    lang,
    accounts,
    categories,
    tags,
    editing = null,
    showLightbox = $bindable(false),
    onSave,
    onDelete,
    onClose,
  }: {
    lang: "en" | "th";
    accounts: Account[];
    categories: Category[];
    tags: Tag[];
    editing: RecordItem | null;
    showLightbox?: boolean;
    onSave: (input: RecordInput) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    onClose: () => void;
  } = $props();

  const initial = untrack(() => editing);
  // The Trajectonomics theme's calculator follows the Theme's surfaces, not the white pad
  // pink and orange draw.
  const robotTheme = $derived($activeTheme === "trajectonomics");
  let kind = $state<RecordKind>(initial?.kind ?? "spending");
  let expr = $state<string>(
    initial ? (initial.amountSatang / 100).toString() : "0"
  );
  let localDate = $state<string>(initial?.localDate ?? todayYmd());
  let categoryId = $state<string | null>(initial?.categoryId ?? null);
  let accountId = $state<string | null>(initial?.accountId ?? "cash");
  let payeeRaw = $state<string>(initial?.payeeRaw ?? "");
  let note = $state<string>(initial?.note ?? "");
  let selectedTags = $state<string[]>(initial?.tagIds ? [...initial.tagIds] : []);
  let recurringFreq = $state<string>("none");
  let showNumpad = $state<boolean>(!initial);
  let showCatPicker = $state<boolean>(false);
  let showSlipRaw = $state<boolean>(false);
  let saving = $state<boolean>(false);

  const slipDataUrl = $derived.by(() => {
    const p = editing?.slipImagePath;
    if (!p || typeof window === "undefined" || !window.MooJotAndroid) return null;
    return window.MooJotAndroid.readSlipImageDataUrl(p);
  });

  const filteredCategories = $derived(
    categories.filter((c) => c.kind === (kind === "income" ? "income" : "spending"))
  );

  const activeCategory = $derived(
    categories.find((c) => c.id === categoryId) ?? null
  );

  const evaluatedBaht = $derived(evalCalcExpression(expr) ?? 0);
  const satangValue = $derived(Math.max(0, Math.round(evaluatedBaht * 100)));

  function tapKey(key: string) {
    if (key === "AC") {
      expr = "0";
      return;
    }
    if (key === "BS") {
      expr = expr.length <= 1 ? "0" : expr.slice(0, -1);
      return;
    }
    if (key === "=") {
      const val = evalCalcExpression(expr);
      if (val !== null) expr = String(val);
      showNumpad = false;
      return;
    }
    if (expr === "0" && /[0-9]/.test(key)) {
      expr = key;
    } else {
      expr += key;
    }
  }

  async function pasteClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = text.replace(/[,฿\s]/g, "").match(/[0-9]+(\.[0-9]+)?/)?.[0];
      if (cleaned) expr = cleaned;
    } catch {
      // Clipboard may be restricted
    }
  }

  function toggleTag(id: string) {
    if (selectedTags.includes(id)) {
      selectedTags = selectedTags.filter((x) => x !== id);
    } else {
      selectedTags = [...selectedTags, id];
    }
  }

  async function submit() {
    if (saving || satangValue <= 0) return;
    saving = true;
    try {
      await onSave({
        id: editing?.id,
        kind,
        amountSatang: satangValue,
        localDate,
        localTime: editing?.localTime ?? null,
        accountId,
        categoryId: kind === "transfer" ? null : categoryId,
        payeeRaw: payeeRaw.trim() || null,
        note: note.trim() || null,
        tagIds: selectedTags,
        recurringFrequency: recurringFreq === "none" ? null : recurringFreq,
      });
    } finally {
      saving = false;
    }
  }
</script>

<div class="fixed inset-0 z-50 flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] overscroll-contain">
  <!-- Brand top header extending seamlessly behind status bar -->
  <header
    class="text-white px-3 pb-0 flex items-center justify-between gap-2 shrink-0"
    style="background: linear-gradient(135deg, var(--hero-from), var(--hero-to)); outline: 1px solid var(--hero-border); outline-offset: -1px; padding-top: max(env(safe-area-inset-top), 36px);"
  >
    <button
      type="button"
      onclick={onClose}
      class="size-10 flex items-center justify-center rounded-full active:bg-black/15"
      aria-label={t(lang, "close")}
    >
      <X class="size-6" />
    </button>

    <div class="flex bg-black/15 rounded-t-2xl overflow-hidden text-xs font-bold">
      {#each (["spending", "income", "transfer"] as const) as tab}
        <button
          type="button"
          onclick={() => {
            kind = tab;
            if (tab === "transfer") categoryId = null;
          }}
          class="px-4 py-2.5 transition-colors {kind === tab
            ? robotTheme
              ? 'bg-[var(--bg-card)] text-[var(--text-primary)] rounded-t-2xl'
              : 'bg-[var(--bg-canvas)] text-[var(--text-primary)] rounded-t-2xl'
            : 'text-white/90'}"
        >
          {t(lang, tab === "transfer" ? "transfers" : tab)}
        </button>
      {/each}
    </div>

    {#if editing && onDelete}
      <button
        type="button"
        onclick={() => onDelete(editing.id)}
        class="size-10 flex items-center justify-center rounded-full bg-black/15 text-white active:bg-red-600"
        aria-label={t(lang, "delete")}
      >
        <Trash2 class="size-5" />
      </button>
    {:else}
      <div class="size-10"></div>
    {/if}
  </header>

  <!-- Scrollable form body (isolated from background page) -->
  <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
    <!-- Date row -->
    <label class="flex items-center gap-2 text-[var(--brand-text)] text-sm font-semibold">
      <Calendar class="size-4 text-[var(--brand)]" />
      <input
        type="date"
        bind:value={localDate}
        class="bg-transparent text-[var(--text-primary)] font-semibold outline-none"
      />
    </label>

    <!-- Amount display card -->
    <button
      type="button"
      onclick={() => (showNumpad = !showNumpad)}
      class="w-full text-left rounded-2xl bg-[var(--bg-card)] border {showNumpad
        ? 'border-[var(--brand)]'
        : 'border-[var(--border-subtle)]'} p-4 transition-colors shadow-xs"
    >
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          {t(lang, "amount")}
        </span>
        {#if expr !== String(evaluatedBaht) && /[+\-×÷*/%]/.test(expr)}
          <span class="text-xs text-[var(--brand-text)] font-mono">{expr}</span>
        {/if}
      </div>
      <div class="mt-1 flex items-baseline gap-2">
        <span
          class="text-3xl font-bold {kind === 'income'
            ? 'text-emerald-500'
            : 'text-[var(--brand)]'}"
        >
          {kind === "income" ? "↓" : kind === "transfer" ? "⇄" : "↑"}
        </span>
        <span class="text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
          {formatBaht(satangValue)}
        </span>
        <span class="text-xl text-[var(--text-muted)]">฿</span>
      </div>
    </button>

    <!-- Category selector -->
    {#if kind !== "transfer"}
      <div class="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden shadow-xs">
        <button
          type="button"
          onclick={() => {
            showCatPicker = !showCatPicker;
            showNumpad = false;
          }}
          class="w-full flex items-center justify-between px-4 py-3.5"
        >
          <div class="flex items-center gap-3">
            {#if activeCategory}
              <CategoryIcon
                icon={activeCategory.icon}
                color={activeCategory.color}
                size="sm"
              />
              <span class="font-semibold text-[var(--text-primary)]">
                {lang === "th" ? activeCategory.nameTh : activeCategory.nameEn}
              </span>
            {:else}
              <CategoryIcon icon="leaf" color="#71717a" size="sm" />
              <span class="text-[var(--brand-text)] font-semibold">{t(lang, "selectCategory")}</span>
            {/if}
          </div>
          <ChevronDown
            class="size-4 text-[var(--text-muted)] transition-transform {showCatPicker ? 'rotate-180' : ''}"
          />
        </button>

        {#if showCatPicker}
          <div class="grid grid-cols-4 gap-2 p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-card-sub)]">
            {#each filteredCategories as cat}
              <button
                type="button"
                onclick={() => {
                  categoryId = cat.id;
                  showCatPicker = false;
                }}
                class="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors {categoryId === cat.id
                  ? 'bg-[var(--brand-soft)] ring-1 ring-[var(--brand)]'
                  : 'hover:bg-black/5'}"
              >
                <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                <span class="text-[11px] leading-tight text-center text-[var(--text-primary)] line-clamp-2">
                  {lang === "th" ? cat.nameTh : cat.nameEn}
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Tags chips -->
    {#if tags.filter((tg) => !tg.disabled).length > 0}
      <div class="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] px-4 py-3 space-y-2 shadow-xs">
        <div class="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <TagIcon class="size-3.5" />
          <span>{t(lang, "tags")}</span>
        </div>
        <div class="flex flex-wrap gap-2">
          {#each tags.filter((tg) => !tg.disabled) as tg}
            {@const active = selectedTags.includes(tg.id)}
            <button
              type="button"
              onclick={() => toggleTag(tg.id)}
              class="px-3 py-1 rounded-full text-xs font-semibold transition-colors {active
                ? 'bg-[var(--brand)] text-[var(--brand-contrast)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}"
            >
              #{tg.name}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Account / Bank selector -->
    <div class="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] px-4 py-3 flex items-center gap-3 shadow-xs">
      <Building2 class="size-4 text-[var(--text-muted)] shrink-0" />
      <select
        bind:value={accountId}
        class="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
      >
        <option value={null}>{t(lang, "other")}</option>
        {#each accounts as acc}
          <option value={acc.id}>
            {lang === "th" ? acc.nameTh : acc.nameEn}
          </option>
        {/each}
      </select>
    </div>

    <!-- Payee & Note -->
    <div class="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3.5 space-y-3 shadow-xs">
      <input
        type="text"
        bind:value={payeeRaw}
        onfocus={() => (showNumpad = false)}
        placeholder={t(lang, "payee")}
        class="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none border-b border-[var(--border-subtle)] pb-2"
      />
      <div class="flex items-start gap-2">
        <FileText class="size-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
        <input
          type="text"
          bind:value={note}
          onfocus={() => (showNumpad = false)}
          placeholder={t(lang, "note")}
          class="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
        />
      </div>
    </div>

    <!-- Recurring record -->
    {#if !editing}
      <div class="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between gap-3 shadow-xs">
        <div class="flex items-center gap-2 text-sm text-[var(--text-primary)]">
          <Repeat class="size-4 text-[var(--brand)]" />
          <span>{t(lang, "recurringRecord")}</span>
        </div>
        <select
          bind:value={recurringFreq}
          class="bg-[var(--bg-elevated)] text-xs text-[var(--brand-text)] font-semibold rounded-lg px-2.5 py-1.5 outline-none"
        >
          <option value="none">{lang === "th" ? "ไม่ซ้ำ" : "One-time"}</option>
          <option value="weekly">{t(lang, "weekly")}</option>
          <option value="biweekly">{t(lang, "biweekly")}</option>
          <option value="monthly">{t(lang, "monthly")}</option>
          <option value="yearly">{lang === "th" ? "รายปี" : "Yearly"}</option>
        </select>
      </div>
    {/if}

    <!-- Attached E-Slip Image & Metadata -->
    {#if editing && (slipDataUrl || editing.slipRef || editing.slipOcrText)}
      <div class="rounded-2xl bg-[var(--bg-card)] border border-[var(--brand-border)] p-3.5 space-y-2.5 shadow-xs">
        {#if slipDataUrl}
          <button
            type="button"
            onclick={() => (showLightbox = true)}
            class="w-full relative rounded-xl overflow-hidden bg-black/5 border border-[var(--border-subtle)]"
          >
            <img
              src={slipDataUrl}
              alt="Attached bank slip"
              class="w-full max-h-56 object-contain mx-auto"
            />
            <span class="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/80 text-white text-[11px] font-semibold px-2.5 py-1">
              <Maximize2 class="size-3 text-[var(--brand)]" />
              <span>{lang === "th" ? "ขยายสลิป" : "View Slip"}</span>
            </span>
          </button>
        {:else if editing.slipRef}
          <div class="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <ImageIcon class="size-4 text-[var(--brand)]" />
            <span>
              {lang === "th"
                ? "กด 'ประมวลผล + แนบสลิปใหม่' ใน มูของฉัน เพื่อแนบรูปสลิป"
                : "Tap Re-parse & Attach Slips in My Moo to attach slip image"}
            </span>
          </div>
        {/if}

        <button
          type="button"
          onclick={() => (showSlipRaw = !showSlipRaw)}
          class="w-full flex items-center justify-between text-xs font-semibold text-[var(--brand-text)]"
        >
          <span>E-Slip Ref: {editing.slipRef ?? "OCR-only"}</span>
          <span>{showSlipRaw ? "▲" : "▼"}</span>
        </button>
        {#if showSlipRaw && editing.slipOcrText}
          <pre class="text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap bg-[var(--bg-input)] rounded-lg p-2.5 max-h-44 overflow-y-auto overscroll-contain border border-[var(--border-subtle)]">{editing.slipOcrText}</pre>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Built-in Calculator Numpad OR Save button -->
  {#if showNumpad}
    <div
      class="{robotTheme
        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-subtle)]'
        : 'bg-white text-[#18181b] border-zinc-200'} px-3 pt-2 shadow-2xl border-t shrink-0"
      style="padding-bottom: max(env(safe-area-inset-bottom), 24px);"
    >
      <div class="flex items-center justify-between pb-2 px-1">
        <button
          type="button"
          onclick={pasteClipboard}
          class="flex items-center gap-1.5 text-sm font-bold text-[var(--brand)] active:opacity-70"
        >
          <ClipboardPaste class="size-4" />
          <span>{lang === "th" ? "วาง" : "Paste"}</span>
        </button>
        <button
          type="button"
          onclick={() => (showNumpad = false)}
          class="text-sm font-bold {robotTheme ? 'text-[var(--text-primary)]' : 'text-[#18181b]'} px-2 py-0.5"
        >
          {t(lang, "done")}
        </button>
      </div>
      <div class="grid grid-cols-4 gap-2 text-lg font-bold">
        <button type="button" onclick={() => tapKey("AC")} class="col-span-2 h-12 rounded-xl {robotTheme ? 'bg-[var(--bg-card-sub)] text-[var(--text-primary)] active:bg-[var(--bg-elevated)]' : 'bg-zinc-100 text-[#18181b] active:bg-zinc-200'}">AC</button>
        <button type="button" onclick={() => tapKey("%")} class="h-12 rounded-xl {robotTheme ? 'bg-[var(--bg-card-sub)] text-[var(--text-primary)] active:bg-[var(--bg-elevated)]' : 'bg-zinc-100 text-[#18181b] active:bg-zinc-200'}">%</button>
        <button type="button" onclick={() => tapKey("÷")} class="h-12 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-text)]">÷</button>

        {#each ["7", "8", "9"] as d}
          <button type="button" onclick={() => tapKey(d)} class="h-12 rounded-xl {robotTheme ? 'bg-[var(--bg-card-sub)] text-[var(--text-primary)] active:bg-[var(--bg-elevated)]' : 'bg-zinc-100 text-[#18181b] active:bg-zinc-200'}">{d}</button>
        {/each}
        <button type="button" onclick={() => tapKey("×")} class="h-12 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-text)]">×</button>

        {#each ["4", "5", "6"] as d}
          <button type="button" onclick={() => tapKey(d)} class="h-12 rounded-xl {robotTheme ? 'bg-[var(--bg-card-sub)] text-[var(--text-primary)] active:bg-[var(--bg-elevated)]' : 'bg-zinc-100 text-[#18181b] active:bg-zinc-200'}">{d}</button>
        {/each}
        <button type="button" onclick={() => tapKey("-")} class="h-12 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-text)]">−</button>

        {#each ["1", "2", "3"] as d}
          <button type="button" onclick={() => tapKey(d)} class="h-12 rounded-xl {robotTheme ? 'bg-[var(--bg-card-sub)] text-[var(--text-primary)] active:bg-[var(--bg-elevated)]' : 'bg-zinc-100 text-[#18181b] active:bg-zinc-200'}">{d}</button>
        {/each}
        <button type="button" onclick={() => tapKey("+")} class="h-12 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-text)]">+</button>

        <button type="button" onclick={() => tapKey(".")} class="h-12 rounded-xl {robotTheme ? 'bg-[var(--bg-card-sub)] text-[var(--text-primary)] active:bg-[var(--bg-elevated)]' : 'bg-zinc-100 text-[#18181b] active:bg-zinc-200'}">.</button>
        <button type="button" onclick={() => tapKey("0")} class="h-12 rounded-xl {robotTheme ? 'bg-[var(--bg-card-sub)] text-[var(--text-primary)] active:bg-[var(--bg-elevated)]' : 'bg-zinc-100 text-[#18181b] active:bg-zinc-200'}">0</button>
        <button type="button" onclick={() => tapKey("BS")} class="h-12 rounded-xl {robotTheme ? 'bg-[var(--bg-card-sub)] text-[var(--text-primary)] active:bg-[var(--bg-elevated)]' : 'bg-zinc-100 text-[#18181b] active:bg-zinc-200'} flex items-center justify-center">
          <Delete class="size-5" />
        </button>
        <button
          type="button"
          onclick={submit}
          disabled={satangValue <= 0 || saving}
          class="h-12 rounded-xl bg-[var(--brand)] text-[var(--brand-contrast)] shadow-xs flex items-center justify-center disabled:opacity-40 active:bg-[var(--brand-deep)]"
        >
          <Check class="size-6" />
        </button>
      </div>
    </div>
  {:else}
    <div
      class="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)] shrink-0"
      style="padding-bottom: max(env(safe-area-inset-bottom), 24px);"
    >
      <button
        type="button"
        onclick={submit}
        disabled={satangValue <= 0 || saving}
        class="w-full py-3.5 rounded-full bg-[var(--brand)] text-[var(--brand-contrast)] font-bold text-base shadow-lg disabled:opacity-40 active:bg-[var(--brand-deep)]"
      >
        {saving ? t(lang, "loading") : t(lang, "save")}
      </button>
    </div>
  {/if}

  {#if showLightbox && slipDataUrl}
    <SlipLightbox
      src={slipDataUrl}
      title={editing?.payeeRaw ?? "E-Slip"}
      onClose={() => (showLightbox = false)}
    />
  {/if}
</div>
