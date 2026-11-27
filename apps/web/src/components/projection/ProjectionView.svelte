<script lang="ts">
import { currentItemNames } from "../../client/item-names.svelte.js"
import type {
	Fi,
	HouseholdDocument,
	ProjectionChance,
	ProjectionRun,
	Read,
} from "../../lib/contract"
import { chooseScenario } from "../../lib/view/plan"
import { firstAges, planPeople, planStats } from "../../lib/view/projection/plan"
import ProjectionCharts from "../charts/ProjectionCharts.svelte"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import PlanFooter from "./PlanFooter.svelte"
import PlanPeople from "./PlanPeople.svelte"
import PlanStats from "./PlanStats.svelte"

interface Props {
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
}

/** The Plan: its people, the three figures, and its chart. The top bar's plan button picks the plan. */
let {
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
}: Props = $props()
const name = $derived(chooseScenario(names, scenario))
const read = $derived(name === null ? undefined : projections[name])
const charts = $derived({
	chart,
	onChart,
	runs: Object.values(projections).flatMap((read) => (read.ok ? [read.data] : [])),
	names: currentItemNames(),
})
</script>

{#if name === null || read === undefined}
	<EmptyState title="No plan to project" />
{:else}
	<ReadView {read} label={`Projection of ${name}`}>
		{#snippet children(run)}
			{@const ages = firstAges(run)}
			<div class="space-y-8">
				<PlanPeople people={planPeople(household, ages)} hasHousehold={household !== null} {editable} />
				<PlanStats stats={planStats(fi, chance, run)} />
				<ProjectionCharts {run} {terms} {onTerms} {charts} />
			</div>
			<section aria-label="Plan items"></section>
			<div class="mt-8"><PlanFooter /></div>
		{/snippet}
	</ReadView>
{/if}
