<script lang="ts">
import PageShell from "../ui/PageShell.svelte"
import WithdrawalsBody from "../withdrawals/WithdrawalsBody.svelte"

interface Props {
	/** The plan the address bar asks for, and the terms it asks for with the setter that writes them. */
	scenario: string
	terms: string
	onTerms: (value: string) => void
}

let { scenario, terms, onTerms }: Props = $props()
</script>

<PageShell
	title="Withdrawals"
	intro="How much a rule pays each year from your savings in retirement, and what it pays in good and bad markets."
>
	{#snippet children(snapshot)}
		<WithdrawalsBody {snapshot} {scenario} {terms} {onTerms} />
	{/snippet}
</PageShell>
