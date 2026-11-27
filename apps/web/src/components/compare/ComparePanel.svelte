<script lang="ts">
import type { ProjectionCompare, ProjectionRun, Read } from "../../lib/contract"
import type { Terms } from "../../lib/view/compare"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import CompareBody from "./CompareBody.svelte"

interface Props {
	/** The compare Read, or null when the Snapshot has no comparison. */
	compare: Read<ProjectionCompare> | null
	/** The Projections by Scenario name, which the chart reads for A and B. */
	projections: Readonly<Record<string, Read<ProjectionRun>>>
	terms: Terms
	onTerms: (terms: Terms) => void
}

/** The command that writes a Snapshot with a comparison of two plans, run in apps/web. */
const COMPARE_COMMAND =
	"traj dashboard --as-of YYYY-MM-DD --horizon YYYY-MM-DD --compare A --compare B"

/** The sides, the chart, the figures and the notes, or the state of a page with no comparison. */
let { compare, projections, terms, onTerms }: Props = $props()
</script>

{#if compare === null}
	<EmptyState title="No comparison yet">
		<p>
			A comparison needs two plans. Ask for one with the flag{" "}
			<code class="font-mono">--compare A --compare B</code> on the Dashboard command:
		</p>
		<pre class="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground"><code
				>{COMPARE_COMMAND}</code
			></pre>
	</EmptyState>
{:else}
	{@const read = compare}
	<ReadView {read} label="The comparison">
		{#snippet children(data)}
			<CompareBody {data} argv={read.argv} {projections} {terms} {onTerms} />
		{/snippet}
	</ReadView>
{/if}
