<script lang="ts">
import type { Snapshot } from "../../lib/contract"
import { personNames } from "../../lib/view/item-names"
import { chooseScenario } from "../../lib/view/plan"
import { claimNoteLines } from "../../lib/view/tax-settings/notes"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import TaxPerYear from "./TaxPerYear.svelte"
import TaxProfileCard from "./TaxProfileCard.svelte"

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
const run = $derived(name === null ? undefined : snapshot.reads.projections[name])
/** The words for the plan's people, so the per-year table names each Return of a separate filing by role. */
const people = $derived(personNames(read?.ok === true ? read.data.scenario.household : null))
/** The CLI's own notes about the stored claims, one paragraph each; none when it refused or the plan keeps no profile. */
const holder = $derived(read?.ok === true ? (read.data.scenario.tax?.claimsHolder ?? null) : null)
const notes = $derived(
	name === null ? [] : claimNoteLines(snapshot.reads.taxNotes[name], people, holder),
)
</script>

{#if name === null || read === undefined}
	<EmptyState title="No plan to read" />
{:else}
	<div class="space-y-10">
		<ReadView {read} label={`The tax profile of ${name}`}>
			{#snippet children(data)}
				<TaxProfileCard
					{name}
					show={data.scenario}
					{editable}
					{notes}
					years={run?.ok === true ? run.data.taxYears : []}
				/>
			{/snippet}
		</ReadView>
		{#if run !== undefined}<TaxPerYear {name} read={run} {people} claimsHolder={holder} />{/if}
	</div>
{/if}
