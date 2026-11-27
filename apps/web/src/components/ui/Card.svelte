<script lang="ts">
import type { Snippet } from "svelte"
import { cx } from "./cx"
import Provenance from "./Provenance.svelte"
import SiteLink from "./SiteLink.svelte"

interface Props {
	title: string
	/** The page this card summarises. The card's heading links to it, with the query string kept. */
	href?: string | undefined
	/** The argv of the Read the card's figures come from. Shown in the footer. */
	argv?: readonly string[]
	/** Raw provenance beside the command, such as the tax rules an id names. */
	details?: Snippet | undefined
	/** A summary card draws no fill, so the focus point above it stays the loudest thing on the page. */
	quiet?: boolean
	/** Classes for the card itself, such as the grid span of a wide card. */
	className?: string | undefined
	children: Snippet
}

let { title, href, argv, details, quiet = false, className, children }: Props = $props()
</script>

<section
	class={cx(
		"relative flex min-w-0 flex-col rounded-lg border border-border p-4 sm:p-5",
		quiet ? "bg-transparent" : "bg-card",
		className,
	)}
>
	<header class="flex items-baseline justify-between gap-3">
		<h2 class="text-base font-semibold">
			{#if href}
				<SiteLink
					{href}
					class="after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"
					>{title}</SiteLink
				>
			{:else}
				{title}
			{/if}
		</h2>
	</header>
	<div
		class="mt-4 flex-1 [&_[role=alert]]:relative [&_[role=alert]]:z-10 [&_[title]]:relative [&_[title]]:z-10 [&_pre]:relative [&_pre]:z-10"
	>
		{@render children()}
	</div>
	{#if argv}
		<footer class="relative mt-4 border-t border-border pt-3">
			<Provenance name={title} commands={[argv]} {details} />
		</footer>
	{/if}
</section>
