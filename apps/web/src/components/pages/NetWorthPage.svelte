<script lang="ts">
import { netWorthPageView } from "../../lib/view/net-worth/page"
import NetWorthContent from "../net-worth/NetWorthContent.svelte"
import PageShell from "../ui/PageShell.svelte"
</script>

<!-- Net worth: the headline, the month-end history, the composition by account and every row. -->
<PageShell
	title="Net worth"
	intro="Net worth at the As-of, its assets and liabilities by account, and its month-end history."
>
	{#snippet children(snapshot)}
		<NetWorthContent view={netWorthPageView(snapshot)} />
	{/snippet}
</PageShell>
