<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { HouseholdDocument, ScenarioAccount, ScenarioDocument } from "../../lib/contract"
import { anchorChoices } from "../../lib/view/estate/anchors"
import { accountFromDraft } from "../../lib/view/plan-items/account-draft"
import { accountDraftOf } from "../../lib/view/plan-items/accounts"
import { accountIds, withAccount, withoutAccount } from "../../lib/view/plan-items/document"
import { type Problems, shownProblems } from "../../lib/view/plan-items/problems"
import { milestoneIds } from "../../lib/view/withdrawals/context"
import { recordOf } from "../../lib/what-if/session"
import AccountFields from "./AccountFields.svelte"
import ItemActions from "./ItemActions.svelte"

interface Props {
	/** The plan's name, which the Edit saves the document under. */
	name: string
	/** The content hash of the plan the page read, which every Edit to it names (cli ADR 0055). */
	contentHash: string
	doc: ScenarioDocument
	/** The household of the plan, whose named dates a payout may start from. Null without one. */
	household?: HouseholdDocument | null
	/** The Account to edit; absent for a new one. */
	existing?: ScenarioAccount | undefined
	/** Runs once the Edit has run, so the drawer closes and the page shows the new Snapshot. */
	onDone: () => void
	/** True when the drawer tries values in the What-if session, instead of saving them. */
	tryValue?: boolean
}

let {
	name,
	doc,
	household = null,
	existing,
	onDone,
	contentHash,
	tryValue = false,
}: Props = $props()
/** What a payout reads of the plan: whether a Levy taxes it, its Milestones and the dates the household names. */
const income = $derived({
	taxed: (doc.levies?.length ?? 0) > 0,
	milestones: milestoneIds(doc),
	anchors: anchorChoices(doc, household, "9999-12-31"),
})
const initial = () => accountDraftOf(existing, income)
let draft = $state(initial())
let problems: Problems = $state({})
const FIELDS = [
	"name",
	"kind",
	"rate",
	"compounding",
	"lockedUntil",
	"payoutRate",
	"payoutFrequency",
	"payoutRounding",
	"payoutStart",
	"payoutKind",
	"feeRate",
	"feeRounding",
]
const shown = $derived(shownProblems(problems, editSession.failure, editSession.error, FIELDS))

/** Saves the plan's document with one change, as one Edit; the drawer closes only when it ran. */
async function commit(next: ScenarioDocument): Promise<void> {
	if (await editSession.run({ kind: "apply-plan", name, contentHash, document: next })) onDone()
}

async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = accountFromDraft(draft, { existing, taken: accountIds(doc), income })
	if (!result.ok) {
		editSession.clear()
		problems = result.problems
		return
	}
	problems = {}
	if (tryValue) {
		// A first payout or fee, or one taken away, is one Set of the whole Account, which a field Set cannot make.
		if (existing !== undefined) {
			whatIfSession.tryAccount(name, contentHash, {
				stored: recordOf(existing),
				edited: { ...recordOf(result.account), id: existing.id },
			})
		}
		onDone()
		return
	}
	await commit(withAccount(doc, result.account))
}
</script>

<form onsubmit={save} class="space-y-6" aria-label={existing ? `Edit ${existing.id}` : "Add account"}>
	<AccountFields bind:draft existingId={existing?.id} {shown} illiquid={existing?.liquid === false} {...income} />
	<ItemActions id={existing?.id} onDelete={() => commit(withoutAccount(doc, existing?.id ?? ""))} trying={tryValue} />
</form>
