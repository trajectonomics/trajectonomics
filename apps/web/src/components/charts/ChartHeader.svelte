<script lang="ts">
import type { Snippet } from "svelte"
import { parseTerms } from "../../lib/view/projection/terms"
import TermsControl from "../projection/TermsControl.svelte"

interface Props {
	/** The chart's name, which its section is named by. */
	title: string
	/** The id the heading takes, when a section points at it. */
	headingId?: string
	/** The terms the address bar asks for. */
	terms: string
	onTerms: (value: string) => void
	/** Controls on the heading's own row, such as the Charts button. */
	actions?: Snippet | undefined
}

/**
 * A chart's heading: its name on the left and its controls on the right, with the choice of terms beside
 * them from `sm` up and on its own row below on a phone, where the controls would not fit beside it.
 */
let { title, headingId, terms, onTerms, actions }: Props = $props()
</script>

<div class="flex flex-wrap items-center gap-2">
	<h2 id={headingId} class="min-w-0 max-w-full flex-1 text-base font-semibold break-words">{title}</h2>
	<div class="order-last w-full sm:order-none sm:w-auto">
		<TermsControl value={parseTerms(terms)} onChange={onTerms} />
	</div>
	{#if actions}
		<div class="shrink-0">{@render actions()}</div>
	{/if}
</div>
