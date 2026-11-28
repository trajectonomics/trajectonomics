<script lang="ts">
import type { ScenarioFlow } from "../../lib/contract"
import type { EmployerDraft } from "../../lib/view/plan-items/employer-draft"
import type { FlowDraft, FlowKind } from "../../lib/view/plan-items/flows"
import { type Choice, FREQUENCY_CHOICES, GROWTH_CHOICES } from "../../lib/view/plan-items/options"
import type { Shown } from "../../lib/view/plan-items/problems"
import FormAlert from "../ui/FormAlert.svelte"
import ItemName from "../ui/ItemName.svelte"
import AnchoredNote from "./AnchoredNote.svelte"
import CategoryField from "./CategoryField.svelte"
import EmployerFields from "./EmployerFields.svelte"
import Field from "./Field.svelte"

interface Props {
	draft: FlowDraft
	kind: FlowKind
	/** The Flow being edited; absent for a new one, whose name becomes its id. */
	existing?: ScenarioFlow | undefined
	shown: Shown
	/** The plan's name, which the household link names. */
	name: string
	/** The label of each date the household pins, or null for a date it does not pin. */
	anchors: { start: string | null; end: string | null }
	/** True when the drawer tries the value in the What-if session, where Apply runs later. */
	trying?: boolean
	/** The categories the plan's expenses already use: suggestions only, never a preset list. */
	categories?: readonly string[]
	/** What the employer adds to a salary, and the Accounts it may pay into. */
	employer?: EmployerDraft
	targets?: readonly string[]
	/** Whether a new income in a taxed plan must be given its label after the save. */
	needsTaxLabel?: boolean
	/** The choices of whose income this is, where the household states Owners; absent hides the field. */
	owners?: readonly Choice[] | undefined
	owner?: string
}

let {
	draft = $bindable(),
	kind,
	existing,
	shown,
	name,
	anchors,
	trying = false,
	categories = [],
	employer = $bindable({ account: "", share: "", rounding: "" }),
	targets = [],
	needsTaxLabel = false,
	owners,
	owner = $bindable(""),
}: Props = $props()

/** What the Ends field says: the once rule, the household's date, or both when the household pins a once Flow's end. */
const endHint = $derived.by(() => {
	const once = "A once Flow ends when it starts."
	const household = "The household sets this date, so it cannot be cleared here."
	if (anchors.end === null)
		return draft.frequency === "once" ? once : "YYYY-MM-DD, or empty to run to the horizon"
	return draft.frequency === "once" ? `${once} ${household}` : household
})
</script>

<!-- The fields of a Flow. Its amount is text, sent as the person typed it, after its commas are removed. -->
<div class="space-y-4">
	{#if needsTaxLabel}<p class="text-sm text-muted-foreground">This plan's tax counts only income it knows by its label. {owners ? "Choose its Owner, then after you save," : "After you save,"} give this income a label in Tax labels.</p>{/if}
	{#if existing}
		<p class="text-sm text-foreground">Item <span class="font-medium"><ItemName kind="flow" id={existing.id} /></span></p>
	{:else}
		<Field id="flow-name" label="Id" hint="The name this plan addresses the item by; it never changes" bind:value={draft.name} problem={shown.at("name")} />
	{/if}
	<Field id="flow-label" label="Name" hint="Shown in place of the id, on cards, charts and pickers. Optional." bind:value={draft.displayLabel} problem={shown.at("displayLabel")} />
	{#if owners}<Field id="flow-owner" label="Owner" hint="Whose income this is" options={owners} bind:value={owner} />{/if}
	<Field id="flow-amount" label="Amount per occurrence" inputmode="decimal" money hint="A decimal number, such as 9000.50" bind:value={draft.amount} problem={shown.at("amount")} />
	<Field id="flow-frequency" label="How often" options={FREQUENCY_CHOICES} bind:value={draft.frequency} problem={shown.at("frequency")} />
	<Field id="flow-start" label="Starts" hint="YYYY-MM-DD" bind:value={draft.start} problem={shown.at("start")} disabled={anchors.start !== null} />
	{#if anchors.start !== null}<AnchoredNote anchor={anchors.start} plan={name} />{/if}
	{#if draft.frequency !== "once" || anchors.end !== null}
		<Field id="flow-end" label="Ends" hint={endHint} bind:value={draft.end} problem={shown.at("end")} disabled={anchors.end !== null} />
		{#if anchors.end !== null}<AnchoredNote anchor={anchors.end} plan={name} />{/if}
		{#if trying && draft.frequency === "once" && anchors.end !== null && draft.start !== draft.end}
			<p class="-mt-3 text-sm text-muted-foreground">A once Flow ends when it starts, so applying this one to the plan will be refused while the household sets its end {anchors.end}.</p>
		{/if}
	{/if}
	<Field id="flow-growth" label="Growth" options={GROWTH_CHOICES} bind:value={draft.growth} problem={shown.at("growth")} />
	{#if draft.growth === "fixed"}
		<Field id="flow-rate" label="Percent a year" inputmode="decimal" hint="Up to two places, such as 3 or 3.50" bind:value={draft.rate} problem={shown.at("rate")} />
	{/if}
	{#if kind === "income"}
		<label class="flex items-center gap-2 text-sm text-foreground">
			<input type="checkbox" bind:checked={draft.earned} class="size-4" />
			Earned income: it stops when earning stops
		</label>
		{#if shown.at("earned")}<p role="alert" class="text-sm text-destructive">{shown.at("earned")}</p>{/if}
		{#if draft.earned}<EmployerFields bind:draft={employer} {shown} {targets} />{/if}
	{/if}
	{#if kind === "expense"}<CategoryField bind:value={draft.category} {categories} problem={shown.at("category")} />{/if}
	{#if shown.general}<FormAlert message={shown.general} />{/if}
</div>
