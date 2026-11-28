<script lang="ts">
import type { Snippet } from "svelte"
import { cx } from "./cx"
import { ANSWER_TEXT, type FocusTone } from "./focus"

interface Props {
	/** "warn" writes the answer in the accent colour, for the few answers that are bad news. */
	tone?: FocusTone
	children: Snippet
}

/**
 * The one figure a focus point answers with, written on its picture at the display size. It takes the room
 * its box gives it and wraps inside it, so a phone reads the whole answer rather than a clipped one.
 */
let { tone = "plain", children }: Props = $props()
</script>

<span
	data-focus-answer
	class={cx(
		ANSWER_TEXT,
		"inline-block max-w-full",
		tone === "warn" ? "text-accent print:text-foreground" : "text-foreground",
	)}>{@render children()}</span>
