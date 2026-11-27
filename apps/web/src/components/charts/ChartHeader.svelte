<script lang="ts">
import type { Snippet } from "svelte"
import { parseTerms } from "../../lib/view/projection/terms"
import TermsControl from "../projection/TermsControl.svelte"

interface Props {
	/** The chart's name, which its section is named by. */
	title: string
	/** The terms the address bar asks for. */
	terms: string
	onTerms: (value: string) => void
	/** Controls beside the terms control, such as the chart picker. */
	actions?: Snippet
}

/** A chart's heading, its terms control and the controls on its right, such as the picker. */
let { title, terms, onTerms, actions }: Props = $props()
</script>

<div class="flex flex-wrap items-start justify-between gap-3">
	<h2 class="min-w-0 max-w-full text-base font-semibold break-words">{title}</h2>
	<div class="flex flex-wrap items-center gap-2">
		<TermsControl value={parseTerms(terms)} onChange={onTerms} />
		{@render actions?.()}
	</div>
</div>
