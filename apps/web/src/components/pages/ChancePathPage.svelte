<script lang="ts">
import PathView from "../chance/path/PathView.svelte"
import PageShell from "../ui/PageShell.svelte"

interface Props {
	/** The plan, the path's index and the terms of the chart, as the address bar names them. */
	scenario: string
	index: string
	terms: string
	onTerms: (value: string) => void
}

/** One Market path of a plan's chance of success, year by year. */
let { scenario, index, terms, onTerms }: Props = $props()
</script>

<PageShell
	title="One future, year by year"
	intro="One seeded Market path of the chance of success, replayed exactly: the returns it drew and what they did to net worth."
>
	{#snippet children(snapshot)}
		<PathView {snapshot} {scenario} {index} {terms} {onTerms} />
	{/snippet}
</PageShell>
