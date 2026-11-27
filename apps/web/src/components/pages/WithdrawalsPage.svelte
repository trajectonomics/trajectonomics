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
>
	{#snippet children(snapshot)}
		<WithdrawalsBody {snapshot} {scenario} {terms} {onTerms} />
	{/snippet}
</PageShell>
