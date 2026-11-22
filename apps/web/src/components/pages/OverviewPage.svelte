<script lang="ts">
import { overviewView } from "../../lib/view/overview/view"
import OverviewGrid from "../overview/OverviewGrid.svelte"
import PageShell from "../ui/PageShell.svelte"
</script>

<!-- The Overview: the headline figures, each card linking to its page and naming its command. -->
<PageShell
	title="Overview"
	intro="The headline figures of your ledger. Each card names the command that produced it."
>
	{#snippet children(snapshot)}
		<OverviewGrid view={overviewView(snapshot)} />
	{/snippet}
</PageShell>
