<script lang="ts">
import { GROWTH_CHOICES } from "../../lib/view/routing/options"
import type { TargetDraft } from "../../lib/view/routing/targets"
import Field from "../plan-items/Field.svelte"

interface Props {
	draft: TargetDraft
	/** The field's id and the label of its amount, such as "Fill up to". */
	id: string
	label: string
	problem?: string | undefined
	/** The problem at a fixed growth's rate. */
	rateProblem?: string | undefined
	disabled?: boolean
}

let { draft = $bindable(), id, label, problem, rateProblem, disabled = false }: Props = $props()
</script>

<!-- A target: an amount as typed, which may keep its value in today's money or grow by a fixed rate. Nothing is filled in. -->
<Field id="{id}-amount" {label} inputmode="decimal" money hint="A decimal number, such as 300000" bind:value={draft.amount} {problem} {disabled} />
<Field id="{id}-growth" label="Over the years" options={GROWTH_CHOICES} bind:value={draft.growth} {disabled} />
{#if draft.growth === "fixed"}
	<Field id="{id}-rate" label="Percent a year" inputmode="decimal" hint="Your own estimate: up to two places, such as 3" bind:value={draft.rate} problem={rateProblem} {disabled} />
{/if}
