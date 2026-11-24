<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { Snapshot } from "../../lib/contract"
import { accountNamesOf } from "../../lib/view/cashflow/cashflow"
import { chooseScenario } from "../../lib/view/projection/scenario"
import { shownPlan } from "../../lib/what-if/routing"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import ContributeSection from "./ContributeSection.svelte"
import SurplusSection from "./SurplusSection.svelte"
import TransferSection from "./TransferSection.svelte"
import WithdrawSection from "./WithdrawSection.svelte"

interface Props {
	snapshot: Snapshot
	/** The Scenario the address bar asks for. An unknown one shows the first plan. */
	scenario: string
	/** Whether the controls show: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
}

let { snapshot, scenario, editable }: Props = $props()
const name = $derived(chooseScenario(snapshot.params.scenarios, scenario))
const read = $derived(name === null ? undefined : snapshot.reads.documents[name])
const saved = $derived(name === null ? undefined : snapshot.reads.projections[name])
const lens = $derived(name === null ? null : whatIfSession.lensFor(name))
const names = $derived(accountNamesOf(snapshot.reads.accounts))
const session = $derived(
	name !== null && whatIfSession.changesFor(name) !== null ? whatIfSession.whatIf : null,
)
</script>

{#if name === null || read === undefined}
	<EmptyState title="No plan document in this Snapshot">
		<p>The Snapshot holds no document for the selected plan, so its routing cannot be shown.</p>
	</EmptyState>
{:else}
	<ReadView {read} label={`The routing of ${name}`}>
		{#snippet children(data)}
			{@const doc = data.scenario.document}
			{@const ctx = {
				name,
				contentHash: data.scenario.contentHash,
				doc,
				shown: shownPlan(doc, session),
				names,
				household: data.scenario.household,
				asOf: snapshot.params.asOf,
				editable,
				run: lens?.run ?? (saved?.ok ? saved.data : undefined),
				tried: lens !== null,
			}}
			<!-- Made again when the plan's hash changes, so a saved change never leaves an old row or an open drawer behind. -->
			{#key ctx.contentHash}
				<div class="space-y-8">
					{#if ctx.tried}<p class="text-sm text-muted-foreground">The figures beside each section are read with your what-if.</p>{/if}
					<SurplusSection {ctx} />
					<ContributeSection {ctx} />
					<WithdrawSection {ctx} />
					<TransferSection {ctx} />
				</div>
			{/key}
		{/snippet}
	</ReadView>
{/if}
