<script lang="ts">
import { withSearch } from "../../lib/view/links"
import EmptyState from "./EmptyState.svelte"
import { SNAPSHOT_COMMAND } from "./snapshot-command"

interface Props {
	/** The page's own path, so "Try the demo" stays on the page. */
	pathname: string
}

let { pathname }: Props = $props()
</script>

<EmptyState title="Nothing to show yet">
	<p>
		<a
			href={withSearch(pathname, "?demo=1")}
			class="inline-block rounded-md bg-accent px-3 py-1.5 font-medium text-accent-foreground hover:underline"
			>Try the demo</a
		>
		<span class="ml-2">A made-up plan, with no ledger of your own.</span>
	</p>
	<p class="mt-4 text-foreground">To see your own plan, run this in a terminal:</p>
	<ul class="mt-2 list-disc space-y-1 pl-5">
		<li>
			<code class="font-mono">--as-of</code>: the date your figures are as of, usually today.
		</li>
		<li>
			<code class="font-mono">--horizon</code>: the last day to plan to, for example the year you turn 90.
		</li>
	</ul>
	<pre class="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground select-all"><code
			>{SNAPSHOT_COMMAND}</code
		></pre>
	<p class="mt-2 text-xs">Replace each YYYY-MM-DD with a date, and run it in the apps/web folder.</p>
</EmptyState>
