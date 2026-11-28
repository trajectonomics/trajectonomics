<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { currentSearch } from "../../client/location.svelte.js"
import type { Snapshot } from "../../lib/contract"
import { editsShown } from "../../lib/edit/shown"
import { skippedReadReason } from "../../lib/view/allowances"
import { NO_PEOPLE, snapshotPeople } from "../../lib/view/item-names"
import { claimsHolderOf } from "../../lib/view/tax-settings/holders"
import EmptyState from "../ui/EmptyState.svelte"
import Provenance from "../ui/Provenance.svelte"
import AllowancesFocus from "./AllowancesFocus.svelte"
import AllowancesResult from "./AllowancesResult.svelte"
import InputForm from "./InputForm.svelte"
import InputSummary from "./InputSummary.svelte"

interface Props {
	snapshot: Snapshot
	/** The plan the page reads: it has a Levy, and the Snapshot holds its items. */
	name: string
}

let { snapshot, name }: Props = $props()
const editable = $derived(editsShown(editSession.token, currentSearch()))
const inputs = $derived(snapshot.params.allowances)
const read = $derived(snapshot.reads.allowances[name])
const stored = $derived(snapshot.reads.documents[name])
const projection = $derived(snapshot.reads.projections[name])
/** Why a Filer plan has no read at all, when it has none: the person chose allowances, but no Return is named. */
const why = $derived(
	inputs === null
		? null
		: skippedReadReason(
				stored?.ok === true ? stored.data.scenario.document : null,
				projection,
				name,
			),
)
/** The household's people, so each Return is named by the role the CLI states. */
const people = $derived(snapshotPeople(snapshot, [name])[name] ?? NO_PEOPLE)
/** The recorded `claimsHolder`, so a departed Return reads here as the profile's tables name it. */
const claimsHolder = $derived(claimsHolderOf(snapshot, name))
const plan = $derived(
	editable && stored?.ok
		? {
				name,
				contentHash: stored.data.scenario.contentHash,
				doc: stored.data.scenario.document,
			}
		: null,
)
</script>

<!-- One plan with a Levy: the focus point first, then the person's order and limits and what the CLI says each Return's allowances could take. -->
<div class="space-y-8">
	{#if read === undefined}
		{#if editable}<InputForm {inputs} />{:else}<InputSummary {inputs} />{/if}
		{#if why !== null}
			<EmptyState title="No Return to read">
				<p>{why.before}<code>{why.command}</code>{why.after}</p>
			</EmptyState>
		{:else}
			<EmptyState title="No allowances read yet">
				<p>Choose the allowances you could buy, in your order, and read them. Nothing is on before you choose.</p>
			</EmptyState>
		{/if}
	{:else}
		<AllowancesFocus {read} plan={name} {people} {claimsHolder} />
		{#if editable}<InputForm {inputs} />{:else}<InputSummary {inputs} />{/if}
		{#if read.ok}
			<AllowancesResult data={read.data} {plan} {people} {claimsHolder} />
		{/if}
		<Provenance name={`Allowances for ${name}`} commands={[read.argv]} />
	{/if}
</div>
