<script lang="ts">
import { currentSearch } from "../../client/location.svelte.js"
import { withSearch } from "../../lib/view/links"
import type { HeroView } from "../../lib/view/overview/hero"

interface Props {
	hero: HeroView
}

/** Home's one-sentence answer, with a count of the CLI's notes worth checking and a link to each. */
let { hero }: Props = $props()
const headingId = $props.id()
const fiHref = $derived(withSearch("/fi/", currentSearch()))
</script>

<section aria-labelledby={headingId} class="rounded-lg border border-border bg-card p-5 sm:p-6">
	<h2 id={headingId} class="sr-only">Your answer</h2>
	<p class="max-w-prose text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
		{hero.sentence}
	</p>
	{#if hero.planNote}
		<p class="mt-3 max-w-prose text-sm text-muted-foreground" data-cli>
			<span class="font-medium text-foreground">{hero.planNote.label}</span>
			{hero.planNote.text}
		</p>
	{/if}
	{#if hero.warningsLabel}
		<p class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
			<span class="font-medium text-foreground">{hero.warningsLabel}</span>
			{#each hero.warnings as warning (warning.anchor)}
				<a
					class="text-accent underline-offset-4 hover:underline"
					href={`${fiHref}#${warning.anchor}`}
					aria-label={`Open ${warning.label} on the FI date page`}>{warning.label}</a
				>
			{/each}
		</p>
	{/if}
</section>
