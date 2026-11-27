<script lang="ts">
import { currentAccountNames } from "../../client/account-names.svelte.js"
import { editSession } from "../../client/edit.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { HouseholdDocument, ScenarioAccount, ScenarioDocument } from "../../lib/contract"
import { nameOf } from "../../lib/view/account-names"
import { anchorChoices } from "../../lib/view/estate/anchors"
import { accountFromDraft } from "../../lib/view/plan-items/account-draft"
import { accountDraftOf } from "../../lib/view/plan-items/accounts"
import { accountIds, withAccount, withoutAccount } from "../../lib/view/plan-items/document"
import { ACCOUNT_FIELDS } from "../../lib/view/plan-items/fields"
import { type Problems, shownProblems } from "../../lib/view/plan-items/problems"
import { namedRefusal } from "../../lib/view/plan-items/refusal"
import { milestoneIds } from "../../lib/view/withdrawals/context"
import { shownAccount } from "../../lib/what-if/lens-document"
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
const names = $derived(currentAccountNames())
/** What a payout reads of the plan: whether a Levy taxes it, its Milestones and the dates the household names. */
const income = $derived({
	taxed: (doc.levies?.length ?? 0) > 0,
	milestones: milestoneIds(doc),
	anchors: anchorChoices(doc, household, "9999-12-31"),
})
/** The Account the form starts from: as the session shows it while a value is tried, so a new try carries the earlier ones. */
const start = $derived(
	tryValue ? shownAccount(doc, whatIfSession.changesFor(name), existing?.id) : existing,
)
const initial = () => accountDraftOf(start, income)
let draft = $state(initial())
let problems: Problems = $state({})
/** The ids of the Accounts of the document the last save sent, in order, and the one it wrote. */
let sent: string[] = $state([])
let savedId: string | undefined = $state()
const refusal = $derived(namedRefusal(editSession.failure, sent, "accounts"))
const item = $derived(`accounts.${savedId ?? existing?.id ?? ""}`)
const shown = $derived(shownProblems(problems, refusal, editSession.error, ACCOUNT_FIELDS, item))

/** Saves the plan's document with one change, as one Edit; the drawer closes only when it ran. */
async function commit(next: ScenarioDocument, id: string): Promise<void> {
	sent = next.accounts.map((account) => account.id)
	savedId = id
	if (await editSession.run({ kind: "apply-plan", name, contentHash, document: next })) onDone()
}

async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const result = accountFromDraft(draft, { existing: start, taken: accountIds(doc), income })
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
	await commit(withAccount(doc, result.account), result.account.id)
}
</script>

<form onsubmit={save} class="space-y-6" aria-label={existing ? `Edit ${nameOf(names, existing.id)}` : "Add account"}>
	<AccountFields bind:draft existingId={existing?.id} {shown} illiquid={existing?.liquid === false} {...income} />
	<ItemActions id={existing?.id} kind="account" onDelete={() => commit(withoutAccount(doc, existing?.id ?? ""), existing?.id ?? "")} trying={tryValue} />
</form>
