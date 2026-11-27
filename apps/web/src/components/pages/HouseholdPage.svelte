<script lang="ts">
import HouseholdSection from "../household/HouseholdSection.svelte"
import PageShell from "../ui/PageShell.svelte"
import SiteLink from "../ui/SiteLink.svelte"

interface Props {
	/** The Scenario the address bar asks for. */
	scenario: string
	/** Whether the Edit controls show: the server answers, and the page is not the Demo snapshot. */
	editable: boolean
}

/** The household of one plan: its people, the dates pinned to them, and the forms that change them. */
let { scenario, editable }: Props = $props()
</script>

<PageShell
	title="Household"
>
	{#snippet children(snapshot)}
		<SiteLink
			href="/projection/"
			class="text-sm text-accent underline-offset-4 hover:underline print:hidden"
		>
			← Plan
		</SiteLink>
		<HouseholdSection {snapshot} {scenario} {editable} />
	{/snippet}
</PageShell>
