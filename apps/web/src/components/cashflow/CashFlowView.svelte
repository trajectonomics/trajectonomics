<script lang="ts">
import { currentItemNames } from "../../client/item-names.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ProjectionRun, Read } from "../../lib/contract"
import { hasCashflow } from "../../lib/view/cashflow/cashflow"
import { chooseScenario } from "../../lib/view/plan"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import CashFlowWhatIf from "../what-if/CashFlowWhatIf.svelte"
import CashFlowBody from "./CashFlowBody.svelte"
import CashFlowFocus from "./CashFlowFocus.svelte"

interface Props {
	/** The Scenarios the Snapshot planned, main first; the plan switcher's choices. */
	names: readonly string[]
	/** The projection Reads of the Snapshot, by Scenario name. */
	projections: Readonly<Record<string, Read<ProjectionRun>>>
	/** The Scenario the plan switcher shows. An unknown one shows the first. */
	scenario: string
	/** The year the address bar asks for, and the setter that writes it. */
	year: string
	onYear: (index: string) => void
}

/** The cash flow of the selected Scenario. The Scenario comes from the plan switcher, the year from the address bar. */
let { names: planNames, projections, scenario, year, onYear }: Props = $props()
const name = $derived(chooseScenario(planNames, scenario))
const read = $derived(name === null ? undefined : projections[name])
const names = $derived(currentItemNames())
</script>

{#if name === null || read === undefined}
	<EmptyState title="No plan to show" />
{:else if read.ok && !hasCashflow(read)}
	<EmptyState title={`No cash flow for ${name}`}>
		<p>These figures hold this plan's projection without its cash flow.</p>
	</EmptyState>
{:else}
	{@const lens = whatIfSession.lensFor(name)}
	<ReadView {read} label={`Cash flow of ${name}`}>
		{#snippet children(run)}
			<div class="space-y-8">
				<CashFlowFocus {run} {year} />
				{#if lens}<CashFlowWhatIf {lens} baseline={run} {year} />{/if}
				<CashFlowBody {run} {year} {onYear} {names} />
			</div>
		{/snippet}
	</ReadView>
{/if}
