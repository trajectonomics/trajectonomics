<script lang="ts">
import PageShell from "../ui/PageShell.svelte"
import ReadView from "../ui/ReadView.svelte"
import Totals from "../ui/Totals.svelte"

interface Props {
	/** The page's heading, such as "Ledger". */
	title: string
	/** The one sentence under the heading. */
	intro: string
}

let { title, intro }: Props = $props()
</script>

<!-- A page not yet ported to Svelte: its heading, one sentence and one real figure from the Snapshot. -->
<PageShell {title} {intro}>
	{#snippet children(snapshot)}
		<ReadView read={snapshot.reads.netWorth} label="Net worth">
			{#snippet children(data)}
				<p class="text-sm text-muted-foreground">Net worth at the As-of</p>
				<div class="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
					<Totals totals={data.totals} />
				</div>
			{/snippet}
		</ReadView>
	{/snippet}
</PageShell>
