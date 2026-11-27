<script lang="ts">
import { allowanceName } from "../../lib/contract/allowance-labels"
import type { AllowancePlan } from "../../lib/snapshot/allowance-params"
import { ORDER_NOTE, SSF_WORDS } from "../../lib/view/allowances"
import Money from "../ui/Money.svelte"

interface Props {
	inputs: AllowancePlan | null
}

let { inputs }: Props = $props()
</script>

<!-- The inputs of the read when the page cannot change them: the Demo snapshot, or no server. -->
<section class="space-y-2 rounded-lg border border-border bg-card p-4 text-sm sm:p-5" aria-label="Your order">
	<h2 class="text-base font-semibold">Your order</h2>
	{#if inputs === null}
		<p class="text-muted-foreground">No allowances are chosen yet.</p>
	{:else}
		<p>{inputs.labels.map(allowanceName).join(", then ")}.</p>
		<p>Step <Money amount={inputs.step} />{#if inputs.budget !== null}, budget <Money amount={inputs.budget} /> a year{/if}{#if inputs.minSaving !== null}, least saving {inputs.minSaving}% a step{/if}.</p>
	{/if}
	<p class="text-muted-foreground">{ORDER_NOTE} {SSF_WORDS}</p>
</section>
