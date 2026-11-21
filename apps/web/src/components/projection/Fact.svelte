<script lang="ts">
import type { Snippet } from "svelte"

interface Props {
	/** The name of the fact, such as "As of". */
	label: string
	/** The fact itself: text, a date, or a Money. */
	children: Snippet
}

/** One labelled fact in a definition list, such as the As-of or the engine version. */
let { label, children }: Props = $props()
</script>

<div class="min-w-0">
	<dt class="text-muted-foreground">{label}</dt>
	<dd class="mt-0.5 break-words">{@render children()}</dd>
</div>
