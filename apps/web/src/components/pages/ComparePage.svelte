<script lang="ts">
import { parseTerms, type Terms } from "../../lib/view/compare"
import ComparePanel from "../compare/ComparePanel.svelte"
import PageShell from "../ui/PageShell.svelte"

interface Props {
	/** The terms the address bar asks for, and the setter that writes them. */
	terms: string
	onTerms: (terms: Terms) => void
}

/** Compare: two Scenarios side by side, and the deltas the CLI states between them. */
let { terms, onTerms }: Props = $props()
const chosen = $derived(parseTerms(terms))
</script>

<PageShell
	title="Compare"
	intro="A is drawn solid and B dashed everywhere on this page. Each difference is B minus A, as the CLI states it."
>
	{#snippet children(snapshot)}
		<ComparePanel
			compare={snapshot.reads.compare}
			projections={snapshot.reads.projections}
			terms={chosen}
			{onTerms}
		/>
	{/snippet}
</PageShell>
