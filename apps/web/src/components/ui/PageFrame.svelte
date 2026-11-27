<script lang="ts">
import type { Snippet } from "svelte"
import type { Snapshot } from "../../lib/contract"
import type { SnapshotState } from "../../lib/view/state"
import FirstRun from "./FirstRun.svelte"
import { SNAPSHOT_COMMAND } from "./snapshot-command"

interface Props {
	/** The page's heading, such as "Net worth". */
	title: string
	/** One sentence under the heading, on what the page shows. */
	intro?: string | undefined
	/** The figures' state: whichever state it is in decides the body. */
	state: SnapshotState
	/** The page's own path, so "View the demo" stays on the page. */
	pathname: string
	/** Renders the page from the ready figures. Runs only when they are ready. */
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
		<p role="status" class="text-muted-foreground">Loading…</p>
	{:else if state.status === "missing"}
		<FirstRun {pathname} />
	{:else if state.status === "invalid"}
		<div role="alert" class="rounded-lg border border-destructive p-4 text-sm">
			<p class="font-medium">These figures could not be read</p>
			<p class="mt-1 text-muted-foreground">{state.url} {state.reason}.</p>
			{#if state.details.length > 0}
				<ul class="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
					{#each state.details as detail, index (index)}
						<li>{detail}</li>
					{/each}
				</ul>
			{/if}
			<p class="mt-2 text-muted-foreground">
				Write new figures with <code class="font-mono">{SNAPSHOT_COMMAND}</code>.
			</p>
		</div>
	{:else}
		{@render children(state.snapshot)}
	{/if}
</section>
