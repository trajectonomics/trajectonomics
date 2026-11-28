<script lang="ts">
import { currentItemNames } from "../../client/item-names.svelte.js"
import { currentSearch } from "../../client/location.svelte.js"
import type {
	Fi,
	HouseholdDocument,
	ProjectionChance,
	ProjectionRun,
	Read,
	Snapshot,
} from "../../lib/contract"
import { withSearch } from "../../lib/view/links"
import { chooseScenario } from "../../lib/view/plan"
import { firstAges, planPeople, planStats } from "../../lib/view/projection/plan"
import ProjectionCharts from "../charts/ProjectionCharts.svelte"
import PlanItemTabs from "../plan-items/PlanItemTabs.svelte"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import PlanFooter from "./PlanFooter.svelte"
import PlanPeople from "./PlanPeople.svelte"
import PlanStats from "./PlanStats.svelte"

interface Props {
	/** The whole Snapshot, whose plan document the item tabs read. */
	snapshot: Snapshot
	/** The Scenarios the Snapshot planned, main first. */
	names: readonly string[]
	/** The projection Reads of the Snapshot, by Scenario name. */
	projections: Readonly<Record<string, Read<ProjectionRun>>>
	/** The Scenario the address bar asks for. An unknown one shows the first. */
	scenario: string
	/** The chosen plan's household, for its people row. */
	household: HouseholdDocument | null
	/** The chosen plan's FI Read, for the date it states. */
	fi: Read<Fi> | undefined
	/** The chosen plan's chance Read, for its percent. */
	chance: Read<ProjectionChance> | undefined
	/** Whether the Edit controls show: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
	terms: string
	onTerms: (value: string) => void
	/** The custom chart the address bar names ("" for none) and its setter. */
	chart: string
	onChart: (id: string) => void
	/** The item tab the address bar names, and the setter that writes it. */
	items: string
	onItems: (value: string) => void
}

/** The Plan: its people, the three figures, its chart, and its items as tabs under it. The top bar's plan button picks the plan. */
let {
	snapshot,
	names,
	projections,
	scenario,
	household,
	fi,
	chance,
	editable,
	terms,
	onTerms,
	chart,
	onChart,
	items,
	onItems,
}: Props = $props()
const name = $derived(chooseScenario(names, scenario))
const read = $derived(name === null ? undefined : projections[name])
/** The run a successful projection Read holds; a failed one states no ages, so the row shows the people alone. */
const run = $derived(read?.ok === true ? read.data : null)
const ages = $derived(run === null ? [] : firstAges(run))
const charts = $derived({
	chart,
	onChart,
	runs: Object.values(projections).flatMap((read) => (read.ok ? [read.data] : [])),
	names: currentItemNames(),
})
</script>

{#if name === null || read === undefined}
	<EmptyState title="No plan to project">
		<p>
			<a class="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
				href={withSearch("/plans/new/", currentSearch())}>Set up a first plan</a>
		</p>
	</EmptyState>
{:else}
	<div class="space-y-8">
		<PlanPeople people={planPeople(household, ages)} hasHousehold={household !== null} {editable} />
		<ReadView {read} label={`Projection of ${name}`}>
			{#snippet children(run)}
				<PlanStats stats={planStats(fi, chance, run)} />
				<ProjectionCharts {run} {terms} {onTerms} {charts} />
			{/snippet}
		</ReadView>
		<PlanItemTabs {snapshot} {scenario} {editable} {items} {onItems} />
		<PlanFooter />
	</div>
{/if}
