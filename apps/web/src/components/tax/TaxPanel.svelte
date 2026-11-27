<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ProjectionRun, Read } from "../../lib/contract"
import { NO_PEOPLE, type PersonNames } from "../../lib/view/item-names"
import { chooseScenario } from "../../lib/view/plan"
import EmptyState from "../ui/EmptyState.svelte"
import Provenance from "../ui/Provenance.svelte"
import ReadView from "../ui/ReadView.svelte"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import TaxWhatIf from "../what-if/TaxWhatIf.svelte"
import TaxBodyView from "./TaxBodyView.svelte"

interface Props {
	/** The Scenarios the Snapshot planned, main first: the choices of the picker. */
	names: readonly string[]
	/** The Projections by Scenario name. */
	projections: Readonly<Record<string, Read<ProjectionRun>>>
	/** The people of each Scenario's household, so a Return is named by role ("You", "Your partner"). */
	people: Readonly<Record<string, PersonNames>>
	/** The recorded `claimsHolder` of each Scenario's stored profile, so a departed Return reads as the profile does. */
	holders: Readonly<Record<string, string | null>>
	/** The Scenario the address bar asks for; empty or unknown falls back to the first one. */
	requested: string
	onScenario: (name: string) => unknown
}

let { names, projections, people, holders, requested, onScenario }: Props = $props()
const options = $derived(names.map((value) => ({ value, label: value })))
const name = $derived(chooseScenario(names, requested))
/** The name the address bar asks for that is not one of the plans, said above the picker; none otherwise. */
const unknown = $derived(requested !== "" && !names.includes(requested) ? requested : null)
const read = $derived(name === null ? undefined : projections[name])
</script>

<!-- The Tax page's body: a Scenario picker, then the chosen Scenario's tax years or its empty state. -->
{#snippet taxScenario(scenario: string, scenarioRead: Read<ProjectionRun>)}
	{@const lens = whatIfSession.lensFor(scenario)}
	<div class="space-y-8">
		{#if lens}<TaxWhatIf {lens} />{/if}
		<ReadView read={scenarioRead} label={`The tax of ${scenario}`}>
			{#snippet children(run)}
				<TaxBodyView
					name={scenario}
					{run}
					people={people[scenario] ?? NO_PEOPLE}
					claimsHolder={holders[scenario] ?? null}
				/>
			{/snippet}
		</ReadView>
		<Provenance name={`Tax of ${scenario}`} commands={[scenarioRead.argv]} />
	</div>
{/snippet}

{#if name === null}
	<EmptyState title="No plan to read" />
{:else}
	<div class="space-y-8">
		<SegmentedControl name="scenario" label="Plan" {options} value={name} onChange={onScenario} />
		{#if unknown !== null}
			<p role="status" class="text-sm text-muted-foreground">
				There is no plan named {unknown}. Showing {name}.
			</p>
		{/if}
		{#if read === undefined}
			<EmptyState title="No Projection to read" />
		{:else}
			{@render taxScenario(name, read)}
		{/if}
	</div>
{/if}
