<script lang="ts">
import type { Shown } from "../../lib/view/plan-items/problems"
import { LABEL_CHOICES } from "../../lib/view/tax-settings/label-choices"
import { labelKey } from "../../lib/view/tax-settings/label-edit"
import Field from "../plan-items/Field.svelte"

interface Props {
	/** The income Flows with no tax label. */
	flows: readonly string[]
	/** The label chosen for each Flow. */
	labels: Record<string, string>
	shown: Shown
}

let { flows, labels = $bindable(), shown }: Props = $props()
</script>

<!-- A plan with no tax rules is labelled in the write that gives it some: `traj` refuses an income Flow with no tax label. -->
{#if flows.length > 0}
	<p class="text-sm text-muted-foreground">The tax rules read an income Flow only when it has a tax label, so choose one for each Flow below.</p>
	{#each flows as flow (flow)}
		<Field id={`tax-flow-${flow}`} label={`Tax label of ${flow}`} options={LABEL_CHOICES} bind:value={() => labels[flow] ?? "", (value) => (labels[flow] = value)} problem={shown.at(labelKey(flow))} />
	{/each}
{/if}
