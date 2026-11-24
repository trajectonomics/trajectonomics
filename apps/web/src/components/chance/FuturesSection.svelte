<script lang="ts">
import type { FuturesView } from "../../lib/view/chance/futures"
import FutureCards from "./FutureCards.svelte"
import FuturesTable from "./FuturesTable.svelte"

interface Props {
	/** The futures of the chance read, or null when the Snapshot lists none (the Demo snapshot, or an older one). */
	futures: FuturesView | null
	plan: string
	currency: string
}

/** The futures worth a look and the table of every future, or the sentence that says where to open them. */
let { futures, plan, currency }: Props = $props()
</script>

{#if futures === null}
	<section aria-labelledby="chance-futures" class="space-y-2">
		<h2 id="chance-futures" class="text-base font-semibold">Every future</h2>
		<p class="text-sm text-muted-foreground">
			This Snapshot does not list the futures. A live dashboard, started with <code>traj dashboard</code>, lists every future
			and opens each one year by year.
		</p>
	</section>
{:else}
	{#if futures.cards.length > 0}
		<section aria-labelledby="chance-worth-a-look" class="space-y-3">
			<h2 id="chance-worth-a-look" class="text-base font-semibold">Futures worth a look</h2>
			<FutureCards cards={futures.cards} {plan} />
		</section>
	{/if}
	<section aria-labelledby="chance-futures" class="space-y-3">
		<h2 id="chance-futures" class="text-base font-semibold">Every future</h2>
		<p class="text-sm text-muted-foreground">
			{futures.ranOut} of {futures.paths} futures ran out of money before the Horizon. Open one to see the returns it
			drew and the year the money fell.
		</p>
		<FuturesTable futures={futures.futures} ranOut={futures.ranOut} {plan} {currency} />
	</section>
{/if}
