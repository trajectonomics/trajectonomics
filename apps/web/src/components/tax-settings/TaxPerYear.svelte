<script lang="ts">
import type { ProjectionRun, Read } from "../../lib/contract"
import type { PersonNames } from "../../lib/view/item-names"
import { type TaxRow, taxRows } from "../../lib/view/tax"
import { returnLabel } from "../../lib/view/tax-settings/return-name"
import Badge from "../ui/Badge.svelte"
import DataTable from "../ui/DataTable.svelte"
import ItemWords from "../ui/ItemWords.svelte"
import Money from "../ui/Money.svelte"
import ReadView from "../ui/ReadView.svelte"
import SiteLink from "../ui/SiteLink.svelte"
import type { Column } from "../ui/table-types"

interface Props {
	name: string
	/** The plan's `projection run`, which the Snapshot already holds: every figure is its own. */
	read: Read<ProjectionRun>
	/** The household's people, so a separate filing's Return is named by role rather than by id. */
	people: PersonNames
	/** The recorded `claimsHolder`, so an id the household no longer names reads as the earlier holder. */
	claimsHolder?: string | null
}

let { name, read, people, claimsHolder = null }: Props = $props()
/** Whether the plan files separately: its years then name a Filer each, and the table says whose Return a row is. */
const withReturn = $derived(read.ok && read.data.taxYears.some((year) => year.filer !== undefined))

const RETURN_COLUMN: Column<TaxRow> = { key: "return", header: "Return", cell: returnCell }
const COLUMNS: readonly Column<TaxRow>[] = [
	{ key: "period", header: "Tax year", cell: periodCell },
	{ key: "settles", header: "Settles", cell: settlesCell },
	{ key: "due", header: "Due before prepayment", numeric: true, cell: dueCell },
	{ key: "owed", header: "Owed", numeric: true, cell: owedCell },
]
const columns = $derived(withReturn ? [RETURN_COLUMN, ...COLUMNS] : COLUMNS)
</script>

{#snippet returnCell(row: TaxRow)}
	{#if row.filer === null}—{:else}<ItemWords label={returnLabel(row.filer, people, claimsHolder)} />{/if}
{/snippet}
{#snippet periodCell(row: TaxRow)}{row.period}{/snippet}
{#snippet settlesCell(row: TaxRow)}{row.settles}{/snippet}
{#snippet dueCell(row: TaxRow)}<Money amount={row.due} />{/snippet}
{#snippet owedCell(row: TaxRow)}
	<span class="inline-flex flex-wrap items-center justify-end gap-2">
		<Money amount={row.owed} />
		{#if row.refund}<Badge tone="accent">Refund</Badge>{/if}
	</span>
{/snippet}

<!-- The tax each year of the plan comes to, as `projection run` states it: a change to the profile shows its effect here after the save. -->
<section aria-labelledby="tax-per-year" class="space-y-3">
	<h2 id="tax-per-year" class="font-semibold">Tax per year of {name}</h2>
	<ReadView {read} label={`The tax per year of ${name}`}>
		{#snippet children(run)}
			{@const rows = taxRows(run.taxYears)}
			{#if run.tax === "not_applied" || rows.length === 0}
				<p class="text-sm text-muted-foreground">The plan has no tax years yet, so its figures are before tax.</p>
			{:else}
				<DataTable caption={`Tax per year, figures in ${run.currency}`} {columns} {rows} rowKey={(row) => row.key} />
				<p class="text-sm text-muted-foreground">More on each year is on <SiteLink href="/tax/" class="underline">Tax</SiteLink>.</p>
			{/if}
		{/snippet}
	</ReadView>
</section>
