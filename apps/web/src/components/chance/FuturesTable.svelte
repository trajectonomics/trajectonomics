<script lang="ts">
import { currentSearch } from "../../client/location.svelte.js"
import type { Future } from "../../lib/view/chance/futures"
import { type Order, pageOfFutures } from "../../lib/view/chance/futures-page"
import { futureHref } from "../../lib/view/chance/links"
import { MONEY_LABELS } from "../../lib/view/chance/money"
import DataTable from "../ui/DataTable.svelte"
import Money from "../ui/Money.svelte"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import type { Column } from "../ui/table-types"
import FutureOutcome from "./FutureOutcome.svelte"
import FuturesPager from "./FuturesPager.svelte"

interface Props {
	futures: readonly Future[]
	ranOut: number
	plan: string
	currency: string
	/** Whether the caption says the figures are in future money. */
	futureMoney: boolean
}

/** Every Market path, one row each: sorted by closing net worth, optionally only the ones that ran out, 25 to a page. */
let { futures, ranOut, plan, currency, futureMoney }: Props = $props()
let order = $state<Order>("worst")
let onlyRanOut = $state(false)
let page = $state(1)
const shown = $derived(pageOfFutures(futures, { order, onlyRanOut, page }))

const columns: Column<Future>[] = [
	{ key: "future", header: "Future", cell: link },
	{ key: "outcome", header: "Outcome", cell: outcome },
	{ key: "closing", header: "Closing net worth", numeric: true, cell: closing },
	{ key: "lowest", header: "Lowest point", numeric: true, cell: lowest },
]
</script>

{#snippet link(future: Future)}
	<a href={futureHref(currentSearch(), plan, future.index)} class="text-accent underline-offset-4 hover:underline"
		>Future {future.index}</a
	>
{/snippet}

{#snippet closing(future: Future)}
	<Money amount={future.closing} signed />
	<span aria-hidden="true" class="mt-1 block h-1.5 w-32 max-w-full rounded bg-muted">
		<span
			class={`block h-full rounded ${future.below ? "bg-destructive" : "bg-accent"}`}
			style="width: {future.bar}%"
		></span>
	</span>
{/snippet}

{#snippet lowest(future: Future)}
	<Money amount={future.lowest} signed />
	<span class="block text-xs text-muted-foreground">in the year starting {future.lowestStart}</span>
{/snippet}

{#snippet outcome(future: Future)}<FutureOutcome {future} />{/snippet}

<div class="space-y-3">
	<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
		<SegmentedControl
			name="futures-order"
			label="Order"
			options={[
				{ value: "worst", label: "Worst first" },
				{ value: "best", label: "Best first" },
			]}
			value={order}
			onChange={(value) => {
				order = value
				page = 1
			}}
		/>
		<label class="flex items-center gap-2 text-sm">
			<input
				type="checkbox"
				checked={onlyRanOut}
				onchange={(event) => {
					onlyRanOut = event.currentTarget.checked
					page = 1
				}}
			/>
			Only the ones that ran out ({ranOut})
		</label>
	</div>
	<DataTable
		caption={`Every future, by closing net worth, in ${currency}${futureMoney ? `. ${MONEY_LABELS.future}` : ""}`}
		{columns}
		rows={shown.rows}
		rowKey={(future) => String(future.index)}
	/>
	<FuturesPager {shown} onPage={(next) => (page = next)} />
</div>
