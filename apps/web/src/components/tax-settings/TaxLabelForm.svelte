<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import type { ScenarioShow } from "../../lib/contract"
import { LABEL_CHOICES } from "../../lib/view/tax-settings/label-choices"
import { labelEdit, labelShown } from "../../lib/view/tax-settings/label-edit"
import { unlabelledIncome } from "../../lib/view/tax-settings/labels"
import Field from "../plan-items/Field.svelte"
import FormAlert from "../ui/FormAlert.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"

interface Props {
	name: string
	/** The plan as `scenario show` reads it: its document and the hash the Edit names. */
	show: ScenarioShow["scenario"]
	/** True while an Edit runs or a What-if session is open: the form stays, and waits. */
	disabled: boolean
}

let { name, show, disabled }: Props = $props()
let flow = $state("")
let label = $state("")
/** The Flow the last save sent, which a refusal names even after the select moves on. */
let sent = $state("")
let problems: Readonly<Record<string, string>> = $state({})
const flows = $derived([
	{ value: "", label: "Choose an income Flow" },
	...unlabelledIncome(show.document).map((id) => ({ value: id, label: id })),
])
const mine = $derived(editSession.source === "tax-label")
const plan = $derived(show.document)
const shown = $derived(
	labelShown(
		problems,
		mine ? editSession.failure : null,
		mine ? editSession.error : null,
		{ flow, sent },
		plan.flows.map((one) => one.id),
	),
)
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** Saves the label as one Edit that names the hash the page read; a refusal lands at its field. */
async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = labelEdit(
		{ name, contentHash: show.contentHash, plan: show.document },
		{ flow, label },
	)
	editSession.clear()
	problems = result.ok ? {} : result.problems
	sent = flow
	if (result.ok && (await editSession.run(result.edit, "tax-label"))) {
		flow = ""
		label = ""
	}
}
</script>

<form onsubmit={save} aria-label="Tax labels" class="space-y-4 rounded-lg border border-border bg-card p-4">
	<h3 class="text-sm font-semibold">Tax labels</h3>
	<p class="text-sm text-muted-foreground">The tax rules read an income Flow only when it has a tax label, and these Flows have none. Label them one at a time; then the tax profile can be set here.</p>
	<Field id="tax-label-flow" label="Income Flow" options={flows} bind:value={flow} problem={shown.at("flow")} {disabled} />
	<Field id="tax-label-label" label="Tax label" options={LABEL_CHOICES} bind:value={label} problem={shown.at("label")} {disabled} />
	{#if shown.general}<FormAlert message={shown.general} />{/if}
	{#if mine}<StaleNotice />{/if}
	<button type="submit" {disabled} class={button}>Save the tax label</button>
</form>
