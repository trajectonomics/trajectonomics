<script lang="ts">
import type { Snippet } from "svelte"
import type { Snapshot } from "../../lib/contract"
import { withSearch } from "../../lib/view/links"
import type { SnapshotState } from "../../lib/view/state"
import EmptyState from "./EmptyState.svelte"
import SiteLink from "./SiteLink.svelte"
import { SNAPSHOT_COMMAND } from "./snapshot-command"

interface Props {
	/** The page's heading, such as "Net worth". */
	title: string
	/** One sentence under the heading, on what the page shows. */
	intro?: string | undefined
	/** The Snapshot state: whichever state it is in decides the body. */
	state: SnapshotState
	/** The page's own path, so "View the demo" stays on the page. */
	pathname: string
	/** Renders the page from the ready Snapshot. Runs only when the Snapshot is ready. */
	children: Snippet<[Snapshot]>
}

let { title, intro, state, pathname, children }: Props = $props()
</script>

<section aria-labelledby="page-title" class="space-y-6">
	<header>
		<h1 id="page-title" class="text-2xl font-semibold tracking-tight">{title}</h1>
		{#if intro}
			<p class="mt-2 max-w-prose text-muted-foreground">{intro}</p>
		{/if}
	</header>
	{#if state.status === "loading"}
		<p role="status" class="text-muted-foreground">Loading the Snapshot.</p>
	{:else if state.status === "missing"}
		<EmptyState title="No Snapshot yet">
			<p>
				Write one from your own ledger, in apps/web, with this command. The dates are the As-of and the
				horizon you want to see.
			</p>
			<pre class="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground"><code
					>{SNAPSHOT_COMMAND}</code
				></pre>
			<p class="mt-3">
				<SiteLink
					href={withSearch(pathname, "?demo=1")}
					class="text-accent underline-offset-4 hover:underline">View the demo</SiteLink
				>
			</p>
		</EmptyState>
	{:else if state.status === "invalid"}
		<div role="alert" class="rounded-lg border border-destructive p-4 text-sm">
			<p class="font-medium">The Snapshot at {state.url} {state.reason}.</p>
			{#if state.details.length > 0}
				<ul class="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
					{#each state.details as detail (detail)}
						<li>{detail}</li>
					{/each}
				</ul>
			{/if}
			<p class="mt-2 text-muted-foreground">
				Write a new Snapshot with <code class="font-mono">{SNAPSHOT_COMMAND}</code>.
			</p>
		</div>
	{:else}
		{@render children(state.snapshot)}
	{/if}
</section>
