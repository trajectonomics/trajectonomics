<script lang="ts">
import type { ScenarioDocument } from "../../lib/contract"
import type { YearView } from "../../lib/view/allowances"
import DataTable from "../ui/DataTable.svelte"
import Money from "../ui/Money.svelte"
import type { Column } from "../ui/table-types"
import LineList from "./LineList.svelte"
import YearActions from "./YearActions.svelte"

interface Props {
	years: readonly YearView[]
	currency: string
	plan: { name: string; contentHash: string; doc: ScenarioDocument } | null
}

let { years, currency, plan }: Props = $props()
let open: string | null = $state(null)
const shown = $derived(years.find((year) => year.key === open))
const columns: readonly Column<YearView>[] = [
	{ key: "period", header: "Tax year", cell: period },
	{ key: "before", header: "Due now", numeric: true, cell: before },
	{ key: "after", header: "Due with suggestions", numeric: true, cell: after },
	{ key: "saving", header: "Saves", numeric: true, cell: saving },
	{ key: "more", header: "Allowances", cell: more },
]
</script>

{#snippet period(year: YearView)}{year.period}{/snippet}
{#snippet before(year: YearView)}<Money amount={year.dueBefore} />{/snippet}
{#snippet after(year: YearView)}<Money amount={year.dueAfter} />{/snippet}
{#snippet saving(year: YearView)}<Money amount={year.saving} />{/snippet}
{#snippet more(year: YearView)}
	<button type="button" class="underline" aria-expanded={open === year.key} onclick={() => (open = open === year.key ? null : year.key)}>
		{open === year.key ? "Hide" : "Show"}
	</button>
{/snippet}

<!-- The later tax years with the same columns. A year opens to its allowances and its actions. -->
<section aria-label="Every later tax year" class="space-y-3">
	<h2 class="text-base font-semibold">Every later tax year</h2>
	<DataTable caption={`Later tax years, figures in ${currency}`} {columns} rows={years} rowKey={(year) => year.key} />
	{#if shown}
		<div class="space-y-3 rounded-lg border border-border p-4">
			<h3 class="text-sm font-medium">{shown.period}</h3>
			<LineList lines={shown.lines} {currency} />
			{#if plan !== null}<YearActions year={shown} {plan} />{/if}
		</div>
	{/if}
</section>
