<script lang="ts">
import { currentSearch } from "../../../client/location.svelte.js"
import { formatDate } from "../../../lib/format"
import { chanceHref } from "../../../lib/view/chance/links"
import { MONEY_LABELS } from "../../../lib/view/chance/money"
import type { PathHeader } from "../../../lib/view/chance/path-view"
import Money from "../../ui/Money.svelte"

interface Props {
	header: PathHeader
	plan: string
	/** Whether the chance also states today's money, so these figures must say they are in future money. */
	futureMoney: boolean
}

/** "Future n of paths", how it ended, and the way back to the Chance page. */
let { header, plan, futureMoney }: Props = $props()
const { ending } = $derived(header)
</script>

<header class="space-y-2">
	<a href={chanceHref(currentSearch(), plan)} class="text-sm text-accent underline-offset-4 hover:underline"
		>Back to Chance of success</a
	>
	<h2 id="path-title" class="text-xl font-semibold">{header.title}</h2>
	<p class="text-sm" data-testid="path-outcome">
		{#if ending.ranOut !== null}
			<span class="font-medium text-destructive">Ran out in {ending.ranOut}</span>, with
			<Money amount={ending.unmet ?? "0.00"} /> unmet that month.
		{:else}
			<span class="font-medium">Lasted</span> to {formatDate(ending.horizon)}.
		{/if}
	</p>
	{#if header.closing !== null && header.lowest !== null}
		{#if futureMoney}<p class="text-sm text-muted-foreground">{MONEY_LABELS.future}</p>{/if}
		<dl class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
			<div>
				<dt class="text-muted-foreground">Closing net worth</dt>
				<dd><Money amount={header.closing} signed /></dd>
			</div>
			<div>
				<dt class="text-muted-foreground">Lowest point</dt>
				<dd>
					<Money amount={header.lowest.amount} signed />, {header.lowest.when}
				</dd>
			</div>
		</dl>
	{/if}
</header>
