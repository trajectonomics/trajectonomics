<script lang="ts">
  import {
    ArrowLeft,
    WandSparkles,
    Loader2,
    CheckCircle2,
    Plus,
    Trash2,
  } from "@lucide/svelte";
  import CategoryIcon from "./CategoryIcon.svelte";
  import type { Category } from "$lib/types";

  interface CategorizeRule {
    id: string;
    pattern: string;
    categoryId: string;
    hitCount: number;
  }

  let {
    lang,
    categories,
    rules,
    onAddRule,
    onDeleteRule,
    onApplyAll,
    onClose,
  }: {
    lang: "en" | "th";
    categories: Category[];
    rules: CategorizeRule[];
    onAddRule: (pattern: string, categoryId: string) => Promise<void>;
    onDeleteRule: (id: string) => Promise<void>;
    onApplyAll: () => Promise<number>;
    onClose: () => void;
  } = $props();

  let pattern = $state<string>("");
  let categoryId = $state<string>("");
  let saving = $state<boolean>(false);
  let applying = $state<boolean>(false);
  let deletingId = $state<string | null>(null);
  let lastResult = $state<number | null>(null);
  let error = $state<string>("");

  const spendingCategories = $derived(
    categories.filter((c) => c.kind === "spending" && !c.archived)
  );
  const sortedRules = $derived([...rules].sort((a, b) => b.hitCount - a.hitCount));

  function categoryFor(id: string): Category | undefined {
    return categories.find((c) => c.id === id);
  }

  const en = {
    title: "Auto-Categorize Rules",
    applyAll: "Auto-categorize uncategorized records",
    applying: "Categorizing...",
    categorized: (n: number) =>
      `Categorized ${n} ${n === 1 ? "record" : "records"}`,
    addRule: "Add Rule",
    keyword: "Keyword (e.g. starbucks, ก๋วยเตี๋ยว, cloudflare)",
    selectCategory: "Select spending category",
    save: "Save",
    saving: "Saving...",
    activeRules: "Active rules",
    learnedCustom: "Learned & custom",
    noRules: "No rules yet — add one above or auto-categorize to learn them.",
    hits: (n: number) => `${n} ${n === 1 ? "hit" : "hits"}`,
    uncategorized: "Uncategorized",
    deleteRule: "Delete rule",
    close: "Close",
    saveFailed: "Could not save rule.",
    applyFailed: "Could not auto-categorize.",
    deleteFailed: "Could not delete rule.",
  };

  const th = {
    title: "กฎจัดหมวดหมู่อัตโนมัติ",
    applyAll: "จัดหมวดหมู่รายการที่ยังไม่มีหมวดหมู่",
    applying: "กำลังจัดหมวดหมู่...",
    categorized: (n: number) => `จัดหมวดหมู่ไป ${n} รายการ`,
    addRule: "เพิ่มกฎ",
    keyword: "คำสำคัญ (เช่น starbucks, ก๋วยเตี๋ยว, cloudflare)",
    selectCategory: "เลือกหมวดหมู่การใช้จ่าย",
    save: "บันทึก",
    saving: "กำลังบันทึก...",
    activeRules: "กฎที่ใช้งานอยู่",
    learnedCustom: "เรียนรู้และกำหนดเอง",
    noRules: "ยังไม่มีกฎ — เพิ่มกฎด้านบนหรือจัดหมวดหมู่อัตโนมัติเพื่อเรียนรู้",
    hits: (n: number) => `${n} ครั้ง`,
    uncategorized: "ไม่มีหมวดหมู่",
    deleteRule: "ลบกฎ",
    close: "ปิด",
    saveFailed: "ไม่สามารถบันทึกกฎได้",
    applyFailed: "ไม่สามารถจัดหมวดหมู่อัตโนมัติได้",
    deleteFailed: "ไม่สามารถลบกฎได้",
  };

  const L = $derived(lang === "th" ? th : en);

  async function addRule() {
    const keyword = pattern.trim();
    if (!keyword || !categoryId || saving) return;
    saving = true;
    error = "";
    try {
      await onAddRule(keyword, categoryId);
      pattern = "";
      categoryId = "";
    } catch {
      error = L.saveFailed;
    } finally {
      saving = false;
    }
  }

  async function applyAll() {
    if (applying) return;
    applying = true;
    error = "";
    try {
      lastResult = await onApplyAll();
    } catch {
      error = L.applyFailed;
    } finally {
      applying = false;
    }
  }

  async function removeRule(id: string) {
    if (deletingId) return;
    deletingId = id;
    error = "";
    try {
      await onDeleteRule(id);
    } catch {
      error = L.deleteFailed;
    } finally {
      deletingId = null;
    }
  }
</script>

<div class="fixed inset-0 z-50 flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] overscroll-contain">
  <!-- Brand header seamlessly extending behind status bar -->
  <header
    class="flex items-center gap-2 px-3 pb-3 text-white shrink-0"
    style="background: linear-gradient(135deg, var(--hero-from), var(--hero-to)); padding-top: max(env(safe-area-inset-top), 36px);"
  >
    <button
      type="button"
      onclick={onClose}
      class="size-10 flex items-center justify-center rounded-full active:bg-black/15"
      aria-label={L.close}
    >
      <ArrowLeft class="size-6" />
    </button>
    <h2 class="flex-1 text-base font-bold">{L.title}</h2>
  </header>

  <div
    class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4"
    style="padding-bottom: max(env(safe-area-inset-bottom), 24px);"
  >
    <section class="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 space-y-3 shadow-xs">
      <button
        type="button"
        onclick={applyAll}
        disabled={applying}
        class="w-full py-3 rounded-xl bg-[var(--brand)] text-white font-bold flex items-center justify-center gap-2 shadow-md transition-colors active:bg-[var(--brand-deep)] disabled:opacity-50"
      >
        {#if applying}
          <Loader2 class="size-5 animate-spin" />
          <span>{L.applying}</span>
        {:else}
          <WandSparkles class="size-5" />
          <span>{L.applyAll}</span>
        {/if}
      </button>

      {#if lastResult !== null}
        <div
          class="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-sm font-medium text-emerald-500"
        >
          <CheckCircle2 class="size-4 shrink-0" />
          <span>{L.categorized(lastResult)}</span>
        </div>
      {/if}
    </section>

    <section class="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 space-y-3 shadow-xs">
      <div class="flex items-center gap-2 text-[var(--brand-text)] text-sm font-bold">
        <Plus class="size-4" />
        <span>{L.addRule}</span>
      </div>
      <form
        class="space-y-3"
        onsubmit={(event) => {
          event.preventDefault();
          void addRule();
        }}
      >
        <input
          type="text"
          bind:value={pattern}
          placeholder={L.keyword}
          class="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand)]"
        />
        <div class="flex gap-2">
          <select
            bind:value={categoryId}
            class="min-w-0 flex-1 rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand)]"
          >
            <option value="">{L.selectCategory}</option>
            {#each spendingCategories as cat (cat.id)}
              <option value={cat.id}>
                {lang === "th" ? cat.nameTh : cat.nameEn}
              </option>
            {/each}
          </select>
          <button
            type="submit"
            disabled={saving || !pattern.trim() || !categoryId}
            class="shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors disabled:opacity-40"
            style="background-color: var(--btn-contrast-bg); color: var(--btn-contrast-text);"
          >
            {saving ? L.saving : L.save}
          </button>
        </div>
      </form>
    </section>

    {#if error}
      <p class="px-1 text-xs text-rose-500">{error}</p>
    {/if}

    <section class="space-y-2">
      <div class="flex items-baseline justify-between gap-2 px-1">
        <h3 class="text-sm font-semibold text-[var(--text-secondary)]">{L.activeRules}</h3>
        <span class="text-xs text-[var(--text-muted)]">{L.learnedCustom}</span>
      </div>

      {#if sortedRules.length === 0}
        <div
          class="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 text-center text-sm text-[var(--text-muted)]"
        >
          {L.noRules}
        </div>
      {:else}
        {#each sortedRules as rule (rule.id)}
          {@const cat = categoryFor(rule.categoryId)}
          <div
            class="flex items-center gap-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 shadow-xs"
          >
            <CategoryIcon
              icon={cat?.icon ?? "hash"}
              color={cat?.color ?? "#64748b"}
              size="sm"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium text-[var(--text-primary)]">{rule.pattern}</p>
              <div class="mt-1 flex flex-wrap items-center gap-2">
                <span
                  class="inline-flex items-center rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand-text)]"
                >
                  {cat ? (lang === "th" ? cat.nameTh : cat.nameEn) : L.uncategorized}
                </span>
                <span class="text-[11px] text-[var(--text-muted)]">{L.hits(rule.hitCount)}</span>
              </div>
            </div>
            <button
              type="button"
              onclick={() => removeRule(rule.id)}
              disabled={deletingId === rule.id}
              class="size-9 flex shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-rose-500 active:bg-rose-500/15 disabled:opacity-40"
              aria-label={L.deleteRule}
            >
              <Trash2 class="size-4" />
            </button>
          </div>
        {/each}
      {/if}
    </section>
  </div>
</div>
