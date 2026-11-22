<script lang="ts">
import type { Snippet } from "svelte"
import { cx } from "./cx"

interface Props {
	children: Snippet
	/** "accent" marks a state the reader must notice, such as demo data. Defaults to "neutral". */
	tone?: "neutral" | "accent"
}

let { children, tone = "neutral" }: Props = $props()
</script>

<span
	class={cx(
		"inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
		tone === "neutral" && "border-border bg-secondary text-secondary-foreground",
		tone === "accent" && "border-accent text-accent",
	)}>{@render children()}</span
>
