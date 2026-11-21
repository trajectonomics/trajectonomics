<script lang="ts">
import type { Snippet } from "svelte"
import Provenance from "./Provenance.svelte"
import SiteLink from "./SiteLink.svelte"

interface Props {
	title: string
	/** The page this card summarises. The card links to it with the query string kept. */
	href?: string
	/** The argv of the Read the card's figures come from. Shown in the footer. */
	argv?: readonly string[]
	children: Snippet
}

let { title, href, argv, children }: Props = $props()
</script>

<section class="flex flex-col rounded-lg border border-border bg-card p-4 sm:p-5">
	<header class="flex items-baseline justify-between gap-3">
		<h2 class="text-base font-semibold">{title}</h2>
		{#if href}
			<SiteLink
				{href}
				aria-label={`Open ${title}`}
				class="text-sm text-accent underline-offset-4 hover:underline">Open</SiteLink
			>
		{/if}
	</header>
	<div class="mt-4 flex-1">{@render children()}</div>
	{#if argv}
		<footer class="mt-4 border-t border-border pt-3">
			<Provenance {argv} />
		</footer>
	{/if}
</section>
