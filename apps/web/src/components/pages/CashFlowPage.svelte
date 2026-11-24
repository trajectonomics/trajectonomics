<script lang="ts">
import CashFlowView from "../cashflow/CashFlowView.svelte"
import PageShell from "../ui/PageShell.svelte"

interface Props {
	/** The Scenario the plan switcher shows. */
	scenario: string
	/** The year the address bar asks for, and the setter that writes it. */
	year: string
	onYear: (index: string) => void
}

/** Where a year's money came from and where it went: a flow diagram of each Annual roll-up, and its lines. */
let { scenario, year, onYear }: Props = $props()
</script>

<PageShell
	title="Cash flow"
	intro="Where each year's money came from, and where it went: income and withdrawals first, then tax, spending, saving and what was left over."
>
	{#snippet children(snapshot)}
		<CashFlowView
			projections={snapshot.reads.projections}
			accounts={snapshot.reads.accounts}
			{scenario}
			{year}
			{onYear}
		/>
	{/snippet}
</PageShell>
