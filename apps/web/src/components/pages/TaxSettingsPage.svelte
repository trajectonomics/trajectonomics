<script lang="ts">
import TaxSettingsBody from "../tax-settings/TaxSettingsBody.svelte"
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
	title="Tax profile"
>
	{#snippet children(snapshot)}
		<TaxSettingsBody {snapshot} {scenario} {editable} />
	{/snippet}
</PageShell>
