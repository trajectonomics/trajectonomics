<script lang="ts">
  import {
    ChevronLeft,
    ChevronRight,
    BarChart3,
    Gauge,
    Plus,
    Trash2,
  } from "@lucide/svelte";
  import CategoryIcon from "./CategoryIcon.svelte";
  import { formatBaht } from "$lib/format";
  import { t } from "$lib/i18n";
  import type {
    BudgetItem,
    Category,
    ComparePayload,
    RecordKind,
    SummaryPayload,
  } from "$lib/types";

  let {
    lang,
    summary,
    compare,
    budgets,
    categories,
    activeKind,
    onChangeKind,
    onPrevPeriod,
    onNextPeriod,
    onAddBudget,
    onDeleteBudget,
  }: {
    lang: "en" | "th";
    summary: SummaryPayload | null;
    compare: ComparePayload | null;
    budgets: BudgetItem[];
    categories: Category[];
    activeKind: RecordKind;
    onChangeKind: (k: RecordKind) => void;
    onPrevPeriod: () => void;
    onNextPeriod: () => void;
    onAddBudget: (input: {
      scopeType: string;
      scopeId: string | null;
      limitSatang: number;
    }) => Promise<void>;
    onDeleteBudget: (id: string) => Promise<void>;
  } = $props();

  let subView = $state<"donut" | "compare" | "budgets">("donut");
  let groupTab = $state<"category" | "tag">("category");
  let showBudgetForm = $state(false);
  let budgetScopeType = $state<"total" | "category">("total");
  let budgetCategoryId = $state<string>("cat_food");
  let budgetLimitInput = $state<string>("5000");

  const activeTotal = $derived(
    !summary
      ? 0
      : activeKind === "income"
        ? summary.incomeSatang
        : activeKind === "transfer"
          ? summary.transferSatang
          : summary.spendingSatang
  );

  const donutSegments = $derived.by(() => {
    if (!summary || summary.byCategory.length === 0 || activeTotal <= 0) return [];
    const radius = 78;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return summary.byCategory.map((item) => {
      const frac = item.amountSatang / activeTotal;
      const len = frac * circumference;
      const seg = {
        ...item,
        dasharray: `${Math.max(0, len - 2)} ${circumference}`,
        dashoffset: -offset,
      };
      offset += len;
      return seg;
    });
  });

  const maxBarSatang = $derived.by(() => {
    if (!compare || compare.bars.length === 0) return 100;
    const m = Math.max(
      compare.averageSatang,
      ...compare.bars.map((b) => b.amountSatang)
    );
    return Math.max(m, 100);
  });

  const avgPct = $derived(
    compare ? Math.min(95, (compare.averageSatang / maxBarSatang) * 100) : 0
  );

  async function submitBudget() {
    const num = Number.parseFloat(budgetLimitInput);
    if (!Number.isFinite(num) || num <= 0) return;
    await onAddBudget({
      scopeType: budgetScopeType,
      scopeId: budgetScopeType === "category" ? budgetCategoryId : null,
      limitSatang: Math.round(num * 100),
    });
    showBudgetForm = false;
  }
</script>

<div class="pb-28 bg-[var(--bg-canvas)] min-h-screen">
  <!-- Brand Period Header seamlessly extending behind status bar -->
  <header
    class="text-white px-4 pb-3 flex items-center justify-between"
    style="background: linear-gradient(135deg, var(--hero-from), var(--hero-to)); padding-top: max(env(safe-area-inset-top), 38px);"
  >
    <button
      type="button"
      onclick={onPrevPeriod}
      class="size-9 rounded-full flex items-center justify-center active:bg-black/15"
      aria-label="Previous"
    >
      <ChevronLeft class="size-5" />
    </button>
    <div class="font-extrabold text-base tracking-tight">
      {summary?.period.label ?? "..."}
    </div>
    <button
      type="button"
      onclick={onNextPeriod}
      class="size-9 rounded-full flex items-center justify-center active:bg-black/15"
      aria-label="Next"
    >
      <ChevronRight class="size-5" />
    </button>
  </header>

  <!-- Crisp White Income / Spending / Remaining card -->
  {#if summary}
    <div class="bg-white text-[#18181b] px-5 pt-4 pb-0 rounded-b-3xl shadow-sm border-b border-[var(--border-subtle)]">
      <div class="grid grid-cols-2 gap-4 text-center">
        <div>
          <div class="text-xs text-zinc-500 font-medium">↓ {t(lang, "income")}</div>
          <div class="text-lg font-extrabold text-emerald-600">
            {formatBaht(summary.incomeSatang)}
          </div>
        </div>
        <div class="border-l border-zinc-200">
          <div class="text-xs text-zinc-500 font-medium">↑ {t(lang, "spending")}</div>
          <div class="text-lg font-extrabold text-[#18181b]">
            {formatBaht(summary.spendingSatang)}
          </div>
        </div>
      </div>
      <div class="text-center text-xs text-zinc-600 mt-1.5 mb-3">
        {t(lang, "remaining")}:
        <span class="font-bold text-[#18181b]">
          {formatBaht(summary.remainingSatang, true)}
        </span>
      </div>

      <!-- 3-way pill tabs -->
      <div class="flex justify-center">
        <div class="inline-flex bg-zinc-100 rounded-t-2xl overflow-hidden text-xs font-bold">
          {#each (["spending", "income", "transfer"] as const) as k}
            <button
              type="button"
              onclick={() => onChangeKind(k)}
              class="px-5 py-2.5 transition-colors {activeKind === k ? 'rounded-t-2xl' : 'text-zinc-600'}"
              style={activeKind === k
                ? "background-color: var(--summary-tab-active-bg); color: var(--summary-tab-active-text);"
                : ""}
            >
              {t(lang, k === "transfer" ? "transfers" : k)}
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Mode Switcher: Donut / Compare / Budgets -->
  <div class="px-4 mt-4 flex items-center justify-center gap-2">
    <button
      type="button"
      onclick={() => (subView = "donut")}
      class="px-4 py-2 rounded-full text-xs font-bold border transition-colors {subView === 'donut'
        ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)]'}"
    >
      {t(lang, "summary")}
    </button>
    <button
      type="button"
      onclick={() => (subView = "compare")}
      class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-colors {subView === 'compare'
        ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)]'}"
    >
      <BarChart3 class="size-3.5" />
      <span>{t(lang, "compare")}</span>
    </button>
    <button
      type="button"
      onclick={() => (subView = "budgets")}
      class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition-colors {subView === 'budgets'
        ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)]'}"
    >
      <Gauge class="size-3.5" />
      <span>{t(lang, "budgets")}</span>
    </button>
  </div>

  {#if subView === "donut" && summary}
    <!-- SVG Donut Chart -->
    <div class="flex flex-col items-center my-5">
      <div class="relative size-52 flex items-center justify-center">
        <svg viewBox="0 0 200 200" class="size-52 -rotate-90">
          <circle
            cx="100"
            cy="100"
            r="78"
            fill="none"
            stroke="var(--track-muted)"
            stroke-width="22"
          />
          {#each donutSegments as seg}
            <circle
              cx="100"
              cy="100"
              r="78"
              fill="none"
              stroke={seg.color}
              stroke-width="22"
              stroke-dasharray={seg.dasharray}
              stroke-dashoffset={seg.dashoffset}
            />
          {/each}
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <span class="text-xs text-[var(--text-muted)]">{summary.period.label}</span>
          <span class="text-xl font-extrabold text-[var(--text-primary)] mt-0.5">
            {formatBaht(activeTotal, true)}
          </span>
        </div>
      </div>
    </div>

    <!-- By Category / By Tag tabs -->
    <div class="grid grid-cols-2 border-b border-[var(--border-subtle)] mx-4 text-sm font-bold">
      <button
        type="button"
        onclick={() => (groupTab = "category")}
        class="py-2.5 border-b-2 transition-colors {groupTab === 'category'
          ? 'border-[var(--brand)] text-[var(--text-primary)]'
          : 'border-transparent text-[var(--text-muted)]'}"
      >
        {t(lang, "byCategory")}
      </button>
      <button
        type="button"
        onclick={() => (groupTab = "tag")}
        class="py-2.5 border-b-2 transition-colors {groupTab === 'tag'
          ? 'border-[var(--brand)] text-[var(--text-primary)]'
          : 'border-transparent text-[var(--text-muted)]'}"
      >
        # {t(lang, "byTag")}
      </button>
    </div>

    <div class="px-4 mt-3 space-y-2">
      {#if groupTab === "category"}
        {#if summary.byCategory.length === 0}
          <p class="text-center text-sm text-[var(--text-muted)] py-8">{t(lang, "noRecords")}</p>
        {:else}
          {#each summary.byCategory as row}
            <div class="flex items-center justify-between rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] px-4 py-3 shadow-xs">
              <div class="flex items-center gap-3">
                <CategoryIcon icon={row.icon} color={row.color} size="sm" />
                <div>
                  <div class="text-sm font-semibold text-[var(--text-primary)]">
                    {lang === "th" ? row.nameTh : row.nameEn}
                  </div>
                  <div class="text-xs text-[var(--text-muted)]">
                    {row.percentage.toFixed(1)}% · {row.count}
                  </div>
                </div>
              </div>
              <div class="text-sm font-bold text-[var(--text-primary)]">
                {formatBaht(row.amountSatang, true)}
              </div>
            </div>
          {/each}
        {/if}
      {:else if summary.byTag.length === 0}
        <p class="text-center text-sm text-[var(--text-muted)] py-8">{t(lang, "empty")}</p>
      {:else}
        {#each summary.byTag as row}
          <div class="flex items-center justify-between rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] px-4 py-3 shadow-xs">
            <div class="flex items-center gap-3">
              <CategoryIcon icon="hash" color={row.color} size="sm" />
              <div>
                <div class="text-sm font-semibold text-[var(--text-primary)]">#{row.name}</div>
                <div class="text-xs text-[var(--text-muted)]">
                  {row.percentage.toFixed(1)}% · {row.count}
                </div>
              </div>
            </div>
            <div class="text-sm font-bold text-[var(--text-primary)]">
              {formatBaht(row.amountSatang, true)}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {:else if subView === "compare" && compare}
    <div class="mx-4 mt-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 space-y-4 shadow-xs">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs text-[var(--text-muted)]">{t(lang, "average")}</div>
          <div class="text-base font-bold text-[var(--brand-text)]">
            {formatBaht(compare.averageSatang, true)}
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-[var(--text-muted)]">{t(lang, "versusAverage")}</div>
          <div
            class="text-sm font-bold {compare.deltaVsAverageSatang > 0
              ? 'text-rose-500'
              : 'text-emerald-500'}"
          >
            {compare.deltaVsAverageSatang >= 0 ? "▲" : "▼"}
            {formatBaht(Math.abs(compare.deltaVsAverageSatang), true)}
          </div>
        </div>
      </div>

      <div class="relative h-48 pt-6 flex items-end justify-between gap-2">
        <div
          class="absolute left-0 right-0 border-t border-dashed border-[var(--brand)] pointer-events-none opacity-75"
          style="bottom: calc({avgPct}% * 0.78 + 24px);"
        ></div>

        {#each compare.bars as bar}
          {@const hPct = Math.max(4, (bar.amountSatang / maxBarSatang) * 100)}
          <div class="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <span class="text-[10px] text-[var(--text-secondary)] font-medium">
              {bar.amountSatang > 0 ? formatBaht(bar.amountSatang) : ""}
            </span>
            <div class="w-full flex items-end justify-center h-32">
              <div
                class="w-7 rounded-t-lg transition-all"
                style="height: {hPct}%; background-color: {bar.isCurrent ? 'var(--brand)' : 'var(--bar-inactive)'};"
              ></div>
            </div>
            <span
              class="text-[11px] {bar.isCurrent
                ? 'text-[var(--brand-text)] font-bold'
                : 'text-[var(--text-muted)]'}"
            >
              {bar.label.split(" ")[0]}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {:else if subView === "budgets"}
    <div class="px-4 mt-5 space-y-4">
      <div class="flex justify-end">
        <button
          type="button"
          onclick={() => (showBudgetForm = !showBudgetForm)}
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--brand)] text-white text-xs font-bold"
        >
          <Plus class="size-4" />
          <span>{t(lang, "addBudget")}</span>
        </button>
      </div>

      {#if showBudgetForm}
        <div class="rounded-2xl bg-[var(--bg-card)] border border-[var(--brand-border)] p-4 space-y-3 shadow-xs">
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              onclick={() => (budgetScopeType = "total")}
              class="py-2 rounded-xl text-xs font-bold {budgetScopeType === 'total'
                ? 'bg-[var(--brand)] text-white'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}"
            >
              {t(lang, "totalSpending")}
            </button>
            <button
              type="button"
              onclick={() => (budgetScopeType = "category")}
              class="py-2 rounded-xl text-xs font-bold {budgetScopeType === 'category'
                ? 'bg-[var(--brand)] text-white'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}"
            >
              {t(lang, "byCategory")}
            </button>
          </div>

          {#if budgetScopeType === "category"}
            <select
              bind:value={budgetCategoryId}
              class="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
            >
              {#each categories.filter((c) => c.kind === "spending") as c}
                <option value={c.id}>{lang === "th" ? c.nameTh : c.nameEn}</option>
              {/each}
            </select>
          {/if}

          <input
            type="number"
            bind:value={budgetLimitInput}
            placeholder="5000"
            class="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
          />

          <button
            type="button"
            onclick={submitBudget}
            class="w-full py-2.5 rounded-xl font-bold text-sm"
            style="background-color: var(--btn-contrast-bg); color: var(--btn-contrast-text);"
          >
            {t(lang, "save")}
          </button>
        </div>
      {/if}

      {#if budgets.length === 0}
        <p class="text-center text-sm text-[var(--text-muted)] py-8">
          {lang === "th"
            ? "ตั้งงบประมาณรายเดือนฟรี ไม่จำกัดหมวดหมู่"
            : "Create free monthly budgets with daily pace alerts."}
        </p>
      {:else}
        {#each budgets as b}
          {@const clampedPct = Math.min(100, b.spentPct)}
          {@const arcLen = Math.PI * 76}
          {@const dashFilled = (clampedPct / 100) * arcLen}
          {@const paceAngle = Math.PI - (b.todayPacePct / 100) * Math.PI}
          {@const paceX = 100 + 76 * Math.cos(paceAngle)}
          {@const paceY = 100 - 76 * Math.sin(paceAngle)}
          {@const over = b.spentSatang > b.limitSatang}
          {@const near = b.spentPct >= b.alertThresholdPct}

          <div class="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 space-y-3 shadow-xs">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <CategoryIcon
                  icon={b.scopeIcon ?? "wallet"}
                  color={b.scopeColor}
                  size="sm"
                />
                <span class="font-semibold text-[var(--text-primary)] text-sm">{b.scopeLabel}</span>
              </div>
              <button
                type="button"
                onclick={() => onDeleteBudget(b.id)}
                class="text-[var(--text-muted)] hover:text-rose-500 p-1"
                aria-label={t(lang, "delete")}
              >
                <Trash2 class="size-4" />
              </button>
            </div>

            <div class="flex flex-col items-center">
              <svg viewBox="0 0 200 118" class="w-56">
                <path
                  d="M 24 100 A 76 76 0 0 1 176 100"
                  fill="none"
                  stroke="var(--track-muted)"
                  stroke-width="16"
                  stroke-linecap="round"
                />
                <path
                  d="M 24 100 A 76 76 0 0 1 176 100"
                  fill="none"
                  stroke={over ? "#f43f5e" : near ? "var(--brand)" : "#22c55e"}
                  stroke-width="16"
                  stroke-linecap="round"
                  stroke-dasharray="{dashFilled} {arcLen}"
                />
                <circle cx={paceX} cy={paceY} r="5" fill="#ffffff" stroke="var(--text-primary)" stroke-width="2" />
              </svg>
              <div class="-mt-12 text-center">
                <div class="text-xs text-[var(--text-muted)]">{t(lang, "spent")}</div>
                <div class="text-2xl font-extrabold text-[var(--text-primary)]">
                  {formatBaht(b.spentSatang, true)}
                </div>
                <div class="text-xs text-[var(--text-muted)] mt-0.5">
                  {t(lang, "remaining")} {formatBaht(b.remainingSatang)} / {formatBaht(b.limitSatang)}
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-subtle)] text-center">
              <div>
                <div class="text-[11px] text-[var(--text-muted)]">
                  {lang === "th" ? "เฉลี่ยใช้/วัน" : "Avg. daily spent"}
                </div>
                <div class="text-sm font-bold text-[var(--text-primary)]">
                  {formatBaht(b.avgDailySpentSatang, true)}
                </div>
              </div>
              <div class="border-l border-[var(--border-subtle)]">
                <div class="text-[11px] text-[var(--text-muted)]">
                  {lang === "th" ? "ใช้ได้/วัน" : "Avg. daily left"}
                </div>
                <div class="text-sm font-bold text-emerald-500">
                  {formatBaht(b.avgDailyRemainingSatang, true)}
                </div>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
