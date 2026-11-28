<script lang="ts">
import type { AssumedCardView } from "../../lib/view/assumed/card"
import AssumedWords from "./AssumedWords.svelte"

interface Props {
	/** Null for a plan that assumes nothing, and then nothing is drawn. */
	view: AssumedCardView | null
}

let { view }: Props = $props()
</script>

<!-- Home's quiet summary of what the plan assumes: one link to the list on the Plan page, with no fill, nothing at
display size and no button, so the focus point above stays the loudest thing (web ADR 0032). The link is a plain
anchor, because the href already holds the page's query before the fragment. -->
{#if view}
	<section aria-labelledby="assumed-card-title" class="relative flex min-w-0 items-start gap-3 rounded-lg border border-border p-4 sm:p-5">
		<div class="min-w-0 flex-1 space-y-2">
			<h2 id="assumed-card-title" class="flex flex-wrap items-baseline gap-x-2 text-base font-semibold">
				<a
					href={view.href}
					class="after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
					>This plan assumes</a
				>
				<span class="text-lg tabular-nums">{view.count}</span>
			</h2>
			<ul class="space-y-1 text-sm text-muted-foreground">
				{#each view.sentences as sentence, index (index)}
					<li><AssumedWords subject={sentence.subject} text={sentence.text} /></li>
				{/each}
			</ul>
		</div>
		<span aria-hidden="true" class="text-muted-foreground">→</span>
	</section>
{/if}
