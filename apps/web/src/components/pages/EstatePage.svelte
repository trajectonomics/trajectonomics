<script lang="ts">
import EstateBody from "../estate/EstateBody.svelte"
import PageShell from "../ui/PageShell.svelte"

interface Props {
	/** The plan the address bar asks for, the terms and the date it asks for, each with the setter that writes it. */
	scenario: string
	terms: string
	onTerms: (value: string) => void
	at: string
	onAt: (value: string) => void
}

let { scenario, terms, onTerms, at, onAt }: Props = $props()
</script>

<PageShell
	title="Estate"
>
	{#snippet children(snapshot)}
		<EstateBody {snapshot} {scenario} {terms} {onTerms} {at} {onAt} />
	{/snippet}
</PageShell>
