<script lang="ts">
import { currentItemText } from "../../client/item-names.svelte"
import type { DateChoice } from "../../lib/view/estate/dates"
import type { PayoutDraft } from "../../lib/view/plan-items/account-income"
import {
	PAYOUT_FREQUENCY_CHOICES,
	PAYOUT_FROM_CHOICES,
	PAYOUT_KIND_CHOICES,
} from "../../lib/view/plan-items/options"
import type { Shown } from "../../lib/view/plan-items/problems"
import { ROUNDING_CHOICES } from "../../lib/view/withdrawals/options"
import Field from "./Field.svelte"

interface Props {
	draft: PayoutDraft
	shown: Shown
	/** The ids of the plan's Milestones, and the dates its household names. A choice is offered only when there is one. */
	milestones: readonly string[]
	anchors: readonly DateChoice[]
	/** True when the plan has a tax Levy: only then does the kind of income pick a label. */
	taxed: boolean
}

let { draft = $bindable(), shown, milestones, anchors, taxed }: Props = $props()
const fromChoices = $derived(
	PAYOUT_FROM_CHOICES.filter(
		(one) =>
			(one.value !== "milestone" || milestones.length > 0) &&
			(one.value !== "anchor" || anchors.length > 0),
	),
)
/** The Milestones by id, with the name the plan states for each; the value stays the id an Edit names. */
const milestoneChoices = $derived([
	{ value: "", label: "Choose a Milestone" },
	...milestones.map((id) => ({ value: id, label: currentItemText("milestone", id) })),
])
</script>

<!-- What the Account pays out as passive income. Nothing is chosen for the person: the share and the rounding are theirs. -->
<fieldset class="min-w-0 space-y-4 rounded-md border border-border p-3">
	<legend class="px-1 text-sm font-medium text-foreground">Pays out</legend>
	<p class="text-xs text-muted-foreground">Leave this section empty when the Account pays nothing out. The share is your own estimate: traj ships none.</p>
	<Field id="payout-rate" label="Share paid out each year" inputmode="decimal" hint="A percent, such as 3.5" bind:value={draft.rate} problem={shown.at("payoutRate")} />
	<Field id="payout-frequency" label="How often" options={PAYOUT_FREQUENCY_CHOICES} bind:value={draft.frequency} problem={shown.at("payoutFrequency")} />
	<Field id="payout-from" label="Paid from" options={fromChoices} bind:value={draft.from} problem={draft.from === "now" ? shown.at("payoutStart") : undefined} />
	{#if draft.from === "milestone"}
		<Field id="payout-milestone" label="Milestone" options={milestoneChoices} bind:value={draft.milestone} problem={shown.at("payoutStart")} />
	{:else if draft.from === "anchor"}
		<Field id="payout-anchor" label="Date the household names" options={[{ value: "", label: "Choose a date" }, ...anchors.map((one) => ({ value: one.value, label: one.label }))]} bind:value={draft.anchor} problem={shown.at("payoutStart")} />
	{:else if draft.from === "date"}
		<Field id="payout-date" label="Date" hint="YYYY-MM-DD" bind:value={draft.date} problem={shown.at("payoutStart")} />
	{/if}
	{#if taxed}
		<Field id="payout-kind" label="Kind of income for tax" hint="Picks the tax label a tax year sums the payout under." options={PAYOUT_KIND_CHOICES} bind:value={draft.kind} problem={shown.at("payoutKind")} />
	{/if}
	<Field id="payout-rounding" label="Each payout rounds" options={ROUNDING_CHOICES} bind:value={draft.rounding} problem={shown.at("payoutRounding")} />
</fieldset>
