<script lang="ts">
import type { AccountList, ProjectionRun, Read } from "../../lib/contract"
import { accountNamesOf, hasCashflow } from "../../lib/view/cashflow/cashflow"
import { chooseScenario, projectionNames } from "../../lib/view/projection/scenario"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import CashFlowBody from "./CashFlowBody.svelte"

interface Props {
	/** The projection Reads of the Snapshot, by Scenario name. */
	projections: Readonly<Record<string, Read<ProjectionRun>>>
	/** The accounts Read, which names each Account a line draws on. */
	accounts: Read<AccountList>
	/** The Scenario the plan switcher shows. An unknown one shows the first. */
	scenario: string
	/** The year the address bar asks for, and the setter that writes it. */
	year: string
	onYear: (index: string) => void
}

/** The cash flow of the selected Scenario. The Scenario comes from the plan switcher, the year from the address bar. */
let { projections, accounts, scenario, year, onYear }: Props = $props()
const name = $derived(chooseScenario(projectionNames(projections), scenario))
const read = $derived(name === null ? undefined : projections[name])
const names = $derived(accountNamesOf(accounts))
</script>

{#if name === null || read === undefined}
	<EmptyState title="No Scenario to show" />
{:else if read.ok && !hasCashflow(read)}
	<EmptyState title={`No cash flow for ${name}`}>
		<p>The Snapshot holds this Scenario's projection without its cash flow.</p>
	</EmptyState>
{:else}
	<ReadView {read} label={`Cash flow of ${name}`}>
		{#snippet children(run)}
			<CashFlowBody {run} {year} {onYear} accountNames={names} />
		{/snippet}
	</ReadView>
{/if}
