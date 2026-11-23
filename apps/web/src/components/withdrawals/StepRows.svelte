<script lang="ts">
import type { Shown } from "../../lib/view/plan-items/problems"
import type { StepDraft } from "../../lib/view/withdrawals/draft"
import Field from "../plan-items/Field.svelte"

interface Props {
	steps: StepDraft[]
	shown: Shown
}

let { steps = $bindable(), shown }: Props = $props()
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
</script>

<!-- Rates by date, optional: a share that rises with age. Each step replaces the rate from its date on. -->
<fieldset class="space-y-3">
	<legend class="text-sm font-medium text-foreground">Rates by date</legend>
	<p class="text-xs text-muted-foreground">Optional. In order of date. Each step replaces your share from that date on.</p>
	{#each steps as step, index (index)}
		<div class="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
			<Field id="spend-step-{index}-from" label="From" hint="YYYY-MM-DD" bind:value={step.from} />
			<Field id="spend-step-{index}-rate" label="Percent" inputmode="decimal" bind:value={step.rate} />
			<button type="button" class={button} aria-label="Remove step {index + 1}" onclick={() => steps.splice(index, 1)}>Remove</button>
		</div>
	{/each}
	{#if shown.at("steps")}<p role="alert" class="text-sm text-destructive">{shown.at("steps")}</p>{/if}
	<button type="button" class={button} onclick={() => steps.push({ from: "", rate: "" })}>Add a step</button>
</fieldset>
