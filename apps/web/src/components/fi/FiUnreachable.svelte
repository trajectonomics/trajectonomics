<script lang="ts">
import type { UnreachableFi } from "../../lib/view/fi/model"
import Stat from "../ui/Stat.svelte"
import BestCase from "./BestCase.svelte"

interface Props {
	model: UnreachableFi
	currency: string
}

/** The unreachable answer: the horizon, what binds the date, and the best case the Scenario reaches. */
let { model, currency }: Props = $props()
</script>

<div class="space-y-6">
	<Stat label="Survival method">
		{#snippet value()}Not reachable before {model.horizon}{/snippet}
	</Stat>
	<p class="max-w-prose">{model.sentence}</p>
	{#if model.best}
		<BestCase best={model.best} {currency} />
	{/if}
</div>
