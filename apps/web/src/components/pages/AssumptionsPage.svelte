<script lang="ts">
import AssumptionsBody from "../assumptions/AssumptionsBody.svelte"
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
	title="Assumptions"
>
	{#snippet children(snapshot)}
		<AssumptionsBody {snapshot} {scenario} {editable} />
	{/snippet}
</PageShell>
