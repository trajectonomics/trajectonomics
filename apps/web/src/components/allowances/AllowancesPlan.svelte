<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { currentSearch } from "../../client/location.svelte.js"
import type { Snapshot } from "../../lib/contract"
import { editsShown } from "../../lib/edit/shown"
import { skippedReadReason } from "../../lib/view/allowances"
import { NO_PEOPLE, snapshotPeople } from "../../lib/view/item-names"
import EmptyState from "../ui/EmptyState.svelte"
import Provenance from "../ui/Provenance.svelte"
import ReadView from "../ui/ReadView.svelte"
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

<!-- One plan with a Levy: the person's order and limits, then what the CLI says each Return's allowances could take. -->
<div class="space-y-8">
	{#if editable}<InputForm {inputs} />{:else}<InputSummary {inputs} />{/if}
	{#if read === undefined}
		{#if why !== null}
			<EmptyState title="No Return to read">
				<p>{why}</p>
			</EmptyState>
		{:else}
			<EmptyState title="No allowances read yet">
				<p>Choose the allowances you could buy, in your order, and read them. Nothing is on before you choose.</p>
			</EmptyState>
		{/if}
	{:else}
		<ReadView {read} label={`The tax allowances of ${name}`}>
			{#snippet children(data)}
				<AllowancesResult {data} {plan} {people} />
			{/snippet}
		</ReadView>
		<Provenance name={`Allowances for ${name}`} commands={[read.argv]} />
	{/if}
</div>
