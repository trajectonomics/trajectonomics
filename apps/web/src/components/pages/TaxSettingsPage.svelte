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
	intro="What your plan assumes about you when it works out Thai personal income tax: your filing status, your family and what you paid in the tax year."
>
	{#snippet children(snapshot)}
		<TaxSettingsBody {snapshot} {scenario} {editable} />
	{/snippet}
</PageShell>
