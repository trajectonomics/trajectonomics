<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ProjectionAllowances, ProjectionRun, Read } from "../../lib/contract"
import { NO_PEOPLE, type PersonNames } from "../../lib/view/item-names"
import { chooseScenario } from "../../lib/view/plan"
import TaxBodyView from "../tax/TaxBodyView.svelte"
import TaxFocus from "../tax/TaxFocus.svelte"
import EmptyState from "../ui/EmptyState.svelte"
import Provenance from "../ui/Provenance.svelte"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import TaxWhatIf from "../what-if/TaxWhatIf.svelte"

interface Props {
	/** The Scenarios the Snapshot planned, main first: the choices of the picker. */
	names: readonly string[]
	/** The Projections by Scenario name. */
	projections: Readonly<Record<string, Read<ProjectionRun>>>
	/** The allowances reads by Scenario name, which state the tax a person could still save. */
	allowances: Readonly<Record<string, Read<ProjectionAllowances>>>
	/** The people of each Scenario's household, so a Return is named by role ("You", "Your partner"). */
	people: Readonly<Record<string, PersonNames>>
	/** The recorded `claimsHolder` of each Scenario's stored profile, so a departed Return reads as the profile does. */
	holders: Readonly<Record<string, string | null>>
	/** The Scenario the address bar asks for; empty or unknown falls back to the first one. */
	requested: string
	onScenario: (name: string) => unknown
}

let { names, projections, allowances, people, holders, requested, onScenario }: Props = $props()
const options = $derived(names.map((value) => ({ value, label: value })))
const name = $derived(chooseScenario(names, requested))
/** The name the address bar asks for that is not one of the plans, said above the picker; none otherwise. */
const unknown = $derived(requested !== "" && !names.includes(requested) ? requested : null)
const read = $derived(name === null ? undefined : projections[name])
</script>

<!-- The Tax page's body: the focus point of the chosen Scenario first, then the picker and its tax years. -->
{#snippet taxScenario(scenario: string, scenarioRead: Read<ProjectionRun>)}
	{@const lens = whatIfSession.lensFor(scenario)}
	<div class="space-y-8">
		<TaxFocus read={scenarioRead} allowances={allowances[scenario]} plan={scenario} />
		<SegmentedControl name="scenario" label="Plan" {options} value={scenario} onChange={onScenario} />
		{#if scenario === name && unknown !== null}
			<p role="status" class="text-sm text-muted-foreground">
				There is no plan named {unknown}. Showing {name}.
			</p>
		{/if}
		{#if scenarioRead.ok}
			{#if lens}<TaxWhatIf {lens} people={people[scenario] ?? NO_PEOPLE} claimsHolder={holders[scenario] ?? null} />{/if}
			<TaxBodyView
				name={scenario}
				run={scenarioRead.data}
				people={people[scenario] ?? NO_PEOPLE}
				claimsHolder={holders[scenario] ?? null}
			/>
		{/if}
		<Provenance name={`Tax of ${scenario}`} commands={[scenarioRead.argv]} />
	</div>
{/snippet}

{#if name === null}
	<EmptyState title="No plan to read" />
{:else if read === undefined}
	<EmptyState title="No Projection to read" />
{:else}
	{@render taxScenario(name, read)}
{/if}
