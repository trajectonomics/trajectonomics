<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { currentSearch } from "../../client/location.svelte.js"
import type { Snapshot } from "../../lib/contract"
import { editsShown } from "../../lib/edit/shown"
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

<!-- One plan with a Levy: the person's order and limits, then what the CLI says those allowances could take. -->
<div class="space-y-8">
	{#if editable}<InputForm {inputs} />{:else}<InputSummary {inputs} />{/if}
	{#if read === undefined}
		<EmptyState title="No allowances read yet">
			<p>Choose the allowances you could buy, in your order, and read them. Nothing is on before you choose.</p>
		</EmptyState>
	{:else}
		<ReadView {read} label={`The tax allowances of ${name}`}>
			{#snippet children(data)}
				<AllowancesResult {data} {plan} />
			{/snippet}
		</ReadView>
		<Provenance argv={read.argv} />
	{/if}
</div>
