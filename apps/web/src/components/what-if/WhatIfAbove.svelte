<script lang="ts">
import type { Snippet } from "svelte"

interface Props {
	/** Whether a What-if lens is open for this page: with none, the page is its content and nothing more. */
	open: boolean
	/** The What-if panel, drawn above the content while a lens is open. */
	whatIf: Snippet
	/** The page's own content. */
	children: Snippet
	/** The spacing between the panel and the content. */
	gap?: string
}

/**
 * The What-if panel above a page's content. The spacing wrapper exists only while a lens is open, so a page with
 * no session renders the same markup it would without a What-if branch.
 */
let { open, whatIf, children, gap = "space-y-8" }: Props = $props()
</script>

{#if open}
	<div class={gap}>
		{@render whatIf()}
		{@render children()}
	</div>
{:else}
	{@render children()}
{/if}
