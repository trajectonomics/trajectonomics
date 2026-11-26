<script lang="ts">
import { currentItemText } from "../../client/item-names.svelte"
import { FREQUENCY_CHOICES } from "../../lib/view/plan-items/options"
import type { Shown } from "../../lib/view/plan-items/problems"
import { WHEN_CHOICES } from "../../lib/view/routing/options"
import type { TransferContext, TransferDraft } from "../../lib/view/routing/transfer-draft"
import Field from "../plan-items/Field.svelte"

interface Props {
	draft: TransferDraft
	ctx: TransferContext
	shown: Shown
}

let { draft = $bindable(), ctx, shown }: Props = $props()
const choices = $derived(
	WHEN_CHOICES.filter(
		(one) =>
			(one.value !== "milestone" || ctx.milestones.length > 0) &&
			(one.value !== "anchor" || ctx.anchors.length > 0),
	),
)
const milestones = $derived([
	{ value: "", label: "Choose a Milestone" },
	...ctx.milestones.map((id) => ({ value: id, label: currentItemText("milestone", id) })),
])
const anchors = $derived([
	{ value: "", label: "Choose a date" },
	...ctx.anchors.map((one) => ({ value: one.value, label: one.label })),
])
</script>

<!-- How often the move happens and when it starts: a date, a Milestone, or a date the household names. -->
<Field id="move-frequency" label="How often" options={FREQUENCY_CHOICES} bind:value={draft.frequency} problem={shown.at("frequency")} />
<Field id="move-when" label="When it starts" options={choices} bind:value={draft.when} />
{#if draft.when === "milestone"}
	<Field id="move-milestone" label="Milestone" options={milestones} bind:value={draft.milestone} problem={shown.at("start")} />
{:else if draft.when === "anchor"}
	<Field id="move-anchor" label="Date the household names" options={anchors} bind:value={draft.anchor} problem={shown.at("start")} />
{:else}
	<Field id="move-date" label="Date" hint="YYYY-MM-DD" bind:value={draft.date} problem={shown.at("start")} />
{/if}
{#if draft.frequency !== "once"}
	<Field id="move-end" label="Ends" hint="YYYY-MM-DD, or empty to run to the horizon" bind:value={draft.end} problem={shown.at("end")} />
{/if}
