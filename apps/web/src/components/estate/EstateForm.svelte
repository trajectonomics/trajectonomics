<script lang="ts">
import { currentAccountNames } from "../../client/account-names.svelte.js"
import { editSession } from "../../client/edit.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ScenarioDocument } from "../../lib/contract"
import { blockFromDraft, draftOf, estateShown, layoutOf, withEstate } from "../../lib/view/estate"
import { accountChoices } from "../../lib/view/estate/options"
import type { Problems } from "../../lib/view/plan-items/problems"
import { withTriedEstate } from "../../lib/what-if/try-estate"
import ItemActions from "../plan-items/ItemActions.svelte"
import LineList from "./LineList.svelte"

interface Props {
	name: string
	/** The content hash of the plan the page read, which the Edit names (cli ADR 0055). */
	contentHash: string
	plan: ScenarioDocument
	onDone: () => void
}

let { name, contentHash, plan, onDone }: Props = $props()
const initial = () => draftOf(plan.estate)
let draft = $state(initial())
let problems: Problems = $state({})
let layout = $state(layoutOf(null))
const accounts = $derived(accountChoices(plan, currentAccountNames()))
const shown = $derived(estateShown(problems, editSession.failure, editSession.error, layout))
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"

/** A refusal and the form's own problems are keyed to a place in the lists, which a line added, removed or moved changes. */
function forget(): void {
	editSession.clear()
	problems = {}
	layout = layoutOf(null)
}

/** The block the draft names, or the problems at its fields (shown, nothing sent). */
function prepare() {
	const result = blockFromDraft(draft, plan.estate)
	editSession.clear()
	problems = result.ok ? {} : result.problems
	return result.ok ? result : null
}

async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = prepare()
	if (result === null) return
	layout = layoutOf(result.block)
	const sent = {
		kind: "apply-plan",
		name,
		contentHash,
		document: withEstate(plan, result.block),
	} as const
	if (await editSession.run(sent)) onDone()
}

/** Tries the block in the What-if session: the plan is not written, and every figure page shows both. */
function tryIt(): void {
	const result = prepare()
	if (result === null) return
	if (whatIfSession.tryChange(name, contentHash, (base) => withTriedEstate(base, result.block)))
		onDone()
}
</script>

<form onsubmit={save} class="space-y-6" aria-label="Set your estate lines">
	<p class="text-sm text-muted-foreground">Each share and amount is your own estimate: none is filled in for you. Inheritance tax is not worked out; if it applies, add it as a settlement cost.</p>
	<LineList bind:draft list="costs" {accounts} {shown} onShape={forget} />
	<LineList bind:draft list="gifts" {accounts} {shown} onShape={forget} />
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
	<!-- A what-if can begin the block on a plan that has none (cli ADR 0065), so every plan can try. -->
	<button type="button" class={button} disabled={editSession.busy || whatIfSession.saving} onclick={tryIt}>Try as a what-if</button>
	<ItemActions />
</form>
