<script lang="ts">
import FiSections from "../fi/FiSections.svelte"
import PageShell from "../ui/PageShell.svelte"
</script>

<!-- The FI date: the survival date per Scenario, or what binds it, and the definition it is read against. -->
<PageShell
	title="FI date"
>
	{#snippet children(snapshot)}
		<FiSections {snapshot} />
	{/snippet}
</PageShell>
