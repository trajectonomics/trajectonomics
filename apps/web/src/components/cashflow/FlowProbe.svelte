<script lang="ts">
import { observeFlowText } from "../../client/flow-text.svelte.js"

interface Props {
	/** The hidden `<text>` the flow diagrams measure their names through, bound by the page. */
	text: SVGTextElement | null
}

/** The one probe the flow diagrams measure through: always drawn and zero-size, so a hidden diagram still fits at its drawn size. */
let { text = $bindable(null) }: Props = $props()
</script>

<svg
	{@attach observeFlowText}
	class="pointer-events-none absolute h-0 w-0 overflow-hidden text-xs"
	text-rendering="geometricPrecision"
	aria-hidden="true"
>
	<text data-flow-size visibility="hidden" aria-hidden="true">Ag Wy 0</text>
	<text
		bind:this={text}
		data-flow-probe
		visibility="hidden"
		aria-hidden="true"
		class="fill-foreground"
	></text>
</svg>
