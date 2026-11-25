<script lang="ts">
import RoutingBody from "../routing/RoutingBody.svelte"
import PageShell from "../ui/PageShell.svelte"

interface Props {
	/** The plan the address bar asks for. */
	scenario: string
	/** Whether the controls show: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
}

let { scenario, editable }: Props = $props()
</script>

<PageShell
	title="Where money goes"
	intro="The order your plan saves what is left over and draws savings when money is short, and the moves you plan between your own accounts."
>
	{#snippet children(snapshot)}
		<RoutingBody {snapshot} {scenario} {editable} />
	{/snippet}
</PageShell>
