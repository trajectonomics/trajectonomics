<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ProjectionAllowances, ProjectionRun, Read } from "../../lib/contract"
import { NO_PEOPLE, type PersonNames } from "../../lib/view/item-names"
import { chooseScenario } from "../../lib/view/plan"
import { returnOf, returnsOf } from "../../lib/view/tax"
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
	/** The Filer of the Return the address bar asks for; empty or unknown opens the first Return. */
	returned: string
	onReturn: (value: string) => unknown
}

let {
	names,
	projections,
	allowances,
	people,
	holders,
	requested,
	onScenario,
	returned,
	onReturn,
}: Props = $props()
const options = $derived(names.map((value) => ({ value, label: value })))
const name = $derived(chooseScenario(names, requested))
/** The name the address bar asks for that is not one of the plans, said above the picker; none otherwise. */
const unknown = $derived(requested !== "" && !names.includes(requested) ? requested : null)
const read = $derived(name === null ? undefined : projections[name])
const returns = $derived(read?.ok === true ? returnsOf(read.data.taxYears) : [])
const picked = $derived(returns.length > 1 ? returnOf(returns, returned) : null)
/** The Return the focus point answers for: the one the switch chose, or the plan's own when it has one Return. */
const filer = $derived(picked?.filer ?? null)
</script>

<!-- One plan's body: the focus point of the Return on screen first, then the plan picker, the Return switch and its years. -->
{#snippet taxScenario(scenario: string, scenarioRead: Read<ProjectionRun>)}
	{@const lens = whatIfSession.lensFor(scenario)}
	{#if scenarioRead.ok}
		{#if lens}<TaxWhatIf {lens} people={people[scenario] ?? NO_PEOPLE} claimsHolder={holders[scenario] ?? null} />{/if}
		<TaxBodyView
			name={scenario}
			run={scenarioRead.data}
			people={people[scenario] ?? NO_PEOPLE}
			claimsHolder={holders[scenario] ?? null}
			chosen={returned}
			onReturn={onReturn}
		/>
	{/if}
	<Provenance name={`Tax of ${scenario}`} commands={[scenarioRead.argv]} />
{/snippet}

{#if name === null}
	<EmptyState title="No plan to read" />
{:else}
	<div class="space-y-8">
		{#if read === undefined}
			<EmptyState title="No Projection to read" />
		{:else}
			<TaxFocus read={read} allowances={allowances[name]} filer={filer} plan={name} />
		{/if}
		<SegmentedControl name="scenario" label="Plan" {options} value={name} onChange={onScenario} />
		{#if read !== undefined && unknown !== null}
			<p role="status" class="text-sm text-muted-foreground">
				There is no plan named {unknown}. Showing {name}.
			</p>
		{/if}
		{#if read !== undefined}
			{@render taxScenario(name, read)}
		{/if}
	</div>
{/if}
