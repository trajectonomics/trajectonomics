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
	intro="How much more RMF, ThaiESG and the other retirement allowances could take each tax year, and the tax that would save."
>
	{#snippet children(snapshot)}
		<AllowancesBody {snapshot} {scenario} />
	{/snippet}
</PageShell>
