<script lang="ts">
import FiSections from "../fi/FiSections.svelte"
import PageShell from "../ui/PageShell.svelte"
</script>

<!-- The FI date: the survival date per Scenario, or what binds it, and the definition it is read against. -->
<PageShell
	title="FI date"
	intro="The date each plan reaches financial independence, or what stops it, and the definition it is read against."
>
	{#snippet children(snapshot)}
		<FiSections fi={snapshot.reads.fi} />
	{/snippet}
</PageShell>
