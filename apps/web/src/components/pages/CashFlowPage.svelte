<script lang="ts">
import CashFlowView from "../cashflow/CashFlowView.svelte"
import PageShell from "../ui/PageShell.svelte"
import SiteLink from "../ui/SiteLink.svelte"

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
>
	{#snippet actions()}
		<SiteLink
			href="/routing/"
			class="whitespace-nowrap text-sm text-accent underline-offset-4 hover:underline"
		>
			Where money goes →
		</SiteLink>
	{/snippet}
	{#snippet children(snapshot)}
		<CashFlowView
			names={snapshot.params.scenarios}
			projections={snapshot.reads.projections}
			{scenario}
			{year}
			{onYear}
		/>
	{/snippet}
</PageShell>
