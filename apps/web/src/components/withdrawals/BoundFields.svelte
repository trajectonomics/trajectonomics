<script lang="ts">
import type { Shown } from "../../lib/view/plan-items/problems"
import type { BoundDraft } from "../../lib/view/withdrawals/draft"
import { BOUND_GROWTH_CHOICES } from "../../lib/view/withdrawals/options"
import Field from "../plan-items/Field.svelte"

interface Props {
	/** "floor" or "ceiling": the field a problem is shown at, and the start of each input's id. */
	name: "floor" | "ceiling"
	label: string
	bound: BoundDraft
	shown: Shown
}

let { name, label, bound = $bindable(), shown }: Props = $props()
</script>

<!-- A lowest or highest yearly amount, optional: an empty amount means the rule has none. -->
<div class="space-y-3">
	<Field id="spend-{name}" {label} inputmode="decimal" hint="The amount of a whole year. Optional, such as 300000.00" bind:value={bound.amount} problem={shown.at(name)} />
	{#if bound.amount.trim() !== ""}
		<Field id="spend-{name}-growth" label="How it grows each year" options={BOUND_GROWTH_CHOICES} bind:value={bound.growth} />
		{#if bound.growth === "fixed"}
			<Field id="spend-{name}-rate" label="Percent a year" inputmode="decimal" hint="Up to two places, such as 3 or 3.50" bind:value={bound.rate} />
		{/if}
	{/if}
</div>
