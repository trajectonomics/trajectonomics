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
	<rect data-flow-size width="1em" height="1em" visibility="hidden" />
	<text bind:this={text} data-flow-probe aria-hidden="true" class="fill-foreground"></text>
</svg>
