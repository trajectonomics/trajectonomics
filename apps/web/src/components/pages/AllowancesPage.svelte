<script lang="ts">
import AllowancesBody from "../allowances/AllowancesBody.svelte"
import PageShell from "../ui/PageShell.svelte"

interface Props {
	/** The plan the address bar asks for. */
	scenario: string
}

let { scenario }: Props = $props()
</script>

<PageShell
	title="Tax allowances"
>
	{#snippet children(snapshot)}
		<AllowancesBody {snapshot} {scenario} />
	{/snippet}
</PageShell>
