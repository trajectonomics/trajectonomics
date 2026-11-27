<script lang="ts">
import type { Snippet } from "svelte"
import { type FocusTone, PRIMARY_ACTION } from "./focus"
import SiteLink from "./SiteLink.svelte"

interface Props {
	/** The whole answer in words, for a screen reader: the question and the facts the page does not show. */
	label: string
	/** The picture the answer is written on. It is hidden from a screen reader, which hears the label instead. */
	visual: Snippet<[FocusTone]>
	/** At most one primary action, under the picture. */
	action?: { readonly label: string; readonly href: string } | undefined
	/** "warn" hands the visual the accent colour. */
	tone?: FocusTone
}

/** The one thing a page opens on: a picture with the answer written on it, and at most one primary action. */
let { label, visual, action, tone = "plain" }: Props = $props()
/** One focus point a page has, so its heading's id is fixed: a second one is a mistake the browser rule refuses. */
const id = "focus-point-answer"
</script>

<section data-focus-section aria-labelledby={id} class="border-b border-border pb-6">
	<h2 data-focus-heading id={id} class="sr-only">{label}</h2>
	<div data-focus-visual data-focus-tone={tone} class="w-full" aria-hidden="true">
		{@render visual(tone)}
	</div>
	{#if action}
		<div class="mt-3 flex flex-wrap items-center gap-3">
			<SiteLink data-primary-action href={action.href} class={PRIMARY_ACTION}
				>{action.label}</SiteLink
			>
		</div>
	{/if}
</section>
