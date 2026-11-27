<script lang="ts">
import type { Snippet } from "svelte"
import Provenance from "./Provenance.svelte"
import SiteLink from "./SiteLink.svelte"

interface Props {
	title: string
	/** The page this card summarises. The card's heading links to it, with the query string kept. */
	href?: string
	/** The argv of the Read the card's figures come from. Shown in the footer. */
	argv?: readonly string[]
	/** Raw provenance beside the command, such as the tax rules an id names. */
	details?: Snippet | undefined
	children: Snippet
}

let { title, href, argv, details, children }: Props = $props()
</script>

<section class="relative flex min-w-0 flex-col rounded-lg border border-border bg-card p-4 sm:p-5">
	<header class="flex items-baseline justify-between gap-3">
		<h2 class="text-base font-semibold">
			{#if href}
				<SiteLink
					{href}
					class="outline-none after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
					>{title}</SiteLink
				>
			{:else}
				{title}
			{/if}
		</h2>
	</header>
	<div class="mt-4 flex-1">{@render children()}</div>
	{#if argv}
		<footer class="relative mt-4 border-t border-border pt-3">
			<Provenance name={title} commands={[argv]} {details} />
		</footer>
	{/if}
</section>
