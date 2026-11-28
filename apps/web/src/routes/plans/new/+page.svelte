<script lang="ts">
import GuidedPlanPage from "../../../components/guided/GuidedPlanPage.svelte"
import PageShell from "../../../components/ui/PageShell.svelte"
</script>

<PageShell title="New plan">
	{#snippet children(snapshot)}
		<GuidedPlanPage {snapshot} />
	{/snippet}
</PageShell>
