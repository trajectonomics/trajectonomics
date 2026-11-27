<script lang="ts">
import type { Snippet } from "svelte"
import type { Snapshot } from "../../lib/contract"
import type { SnapshotState } from "../../lib/view/state"
import FirstRun from "./FirstRun.svelte"
import { SNAPSHOT_COMMAND } from "./snapshot-command"

interface Props {
	/** The page's heading, such as "Net worth". */
	title: string
	/** The Snapshot state: whichever state it is in decides the body. */
	state: SnapshotState
	/** The page's own path, so "View the demo" stays on the page. */
	pathname: string
	/** Renders the page from the ready Snapshot. Runs only when the Snapshot is ready. */
	children: Snippet<[Snapshot]>
	/** A control placed at the heading's right, such as the Cash flow page's link to Where money goes. */
	actions?: Snippet | undefined
}

let { title, state, pathname, children, actions }: Props = $props()
</script>

<section aria-labelledby="page-title" class="space-y-6">
	<header class="flex items-baseline justify-between gap-3">
		<h1 id="page-title" class="text-xl font-semibold tracking-tight">{title}</h1>
		{#if actions}{@render actions()}{/if}
	</header>
	{#if state.status === "loading"}
		<p role="status" class="text-muted-foreground">Loading the Snapshot.</p>
	{:else if state.status === "missing"}
		<FirstRun {pathname} />
	{:else if state.status === "invalid"}
		<div role="alert" class="rounded-lg border border-destructive p-4 text-sm">
			<p class="font-medium">The Snapshot at {state.url} {state.reason}.</p>
			{#if state.details.length > 0}
				<ul class="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
					{#each state.details as detail, index (index)}
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
