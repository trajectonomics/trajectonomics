<script lang="ts">
import { currentAccountNames } from "../../client/account-names.svelte.js"
import { editSession } from "../../client/edit.svelte.js"
import type { Baseline, HouseholdDocument, Read, ScenarioDocument } from "../../lib/contract"
import { nameOf } from "../../lib/view/account-names"
import { balanceOf } from "../../lib/view/plan-items/accounts"
import { realAssetById } from "../../lib/view/plan-items/asset-document"
import { newAssetDraft, percentFields } from "../../lib/view/plan-items/asset-draft"
import { assetAnchors } from "../../lib/view/plan-items/asset-link"
import { ownedChoicesOf, routedChoicesOf } from "../../lib/view/plan-items/asset-owned"
import { assetDraftOf } from "../../lib/view/plan-items/asset-read"
import {
	type AssetLayout,
	assetLayoutOf,
	assetShown,
} from "../../lib/view/plan-items/asset-refusal"
import type { Problems } from "../../lib/view/plan-items/problems"
import AssetFields from "./AssetFields.svelte"
import { removeAsset, submitAsset } from "./asset-submit"
import ItemActions from "./ItemActions.svelte"
import TryNotice from "./TryNotice.svelte"

interface Props {
	/** The plan's name, which the Edit saves the document under. */
	name: string
	/** The content hash of the plan the page read, which every Edit to it names (cli ADR 0055). */
	contentHash: string
	doc: ScenarioDocument
	household: HouseholdDocument | null
	baseline: Read<Baseline>
	/** The asset to edit, by the id of its Account; absent for a new one. */
	assetId?: string | undefined
	onDone: () => void
	/** True when the drawer tries values in the What-if session, instead of saving them. */
	tryValue?: boolean
}

let {
	name,
	contentHash,
	doc,
	household,
	baseline,
	assetId,
	onDone,
	tryValue = false,
}: Props = $props()
const existing = $derived(assetId === undefined ? undefined : realAssetById(doc, assetId)?.parts)
const choices = $derived(ownedChoicesOf(doc, baseline, existing?.account.id, currentAccountNames()))
const routed = $derived(routedChoicesOf(doc, baseline, existing?.account.id, currentAccountNames()))
/** True when the Baseline holds a balance in the Account: it stays declared, or no read can run. */
const held = $derived(existing !== undefined && balanceOf(existing.account, baseline) !== null)
const anchors = $derived(assetAnchors(household, existing?.account.id ?? ""))
const initial = () => (existing === undefined ? newAssetDraft() : assetDraftOf(existing))
let draft = $state(initial())
let problems: Problems = $state({})
let layout: AssetLayout = $state({ id: "", owned: false, accounts: [], flows: [], percents: [] })
let cleared: string[] = $state([])
const shown = $derived(assetShown(problems, editSession.failure, editSession.error, layout))

/** Saves the plan's document with the asset's change, as one Edit; the drawer closes only when it ran. */
async function commit(next: ScenarioDocument, id: string, owned: boolean): Promise<void> {
	layout = assetLayoutOf(next, id, owned, percentFields(draft))
	if (await editSession.run({ kind: "apply-plan", name, contentHash, document: next })) onDone()
}

async function save(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	const sent = submitAsset(draft, { name, contentHash, doc, existing, choices, tryValue })
	if (sent.kind === "save") {
		problems = {}
		await commit(sent.document, sent.id, sent.owned)
		return
	}
	editSession.clear()
	problems = sent.kind === "problems" ? sent.problems : {}
	if (sent.kind === "tried") {
		cleared = sent.cleared
		if (cleared.length === 0) onDone()
	}
}

/** Takes the asset out of the plan, or says why it cannot be. */
async function remove(): Promise<void> {
	const sent = removeAsset(doc, existing, held)
	if (sent.kind === "save") await commit(sent.document, sent.id, sent.owned)
	else {
		editSession.clear()
		problems = sent.kind === "problems" ? sent.problems : {}
	}
}
</script>

<form onsubmit={save} class="min-w-0 space-y-6" aria-label={existing ? `Edit asset ${nameOf(currentAccountNames(), existing.account.id)}` : "Add a home or car"}>
	<AssetFields bind:draft editing={existing !== undefined} {choices} {routed} {shown} {anchors} plan={name} />
	{#if tryValue}
		<p class="text-sm text-muted-foreground">A Try changes the asset's terms in the What-if. It cannot add or take out one of its items.</p>
	{/if}
	<TryNotice fields={cleared} />
	<ItemActions
		id={existing?.account.id} kind="account"
		onDelete={remove}
		note={held ? "Its purchase, costs, rent, sale and loan are removed. The Account stays in the plan as an ordinary asset, because the ledger holds it." : "Its purchase, costs, rent, sale and loan are removed."}
		trying={tryValue}
	/>
</form>
