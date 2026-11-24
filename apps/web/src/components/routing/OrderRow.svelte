<script lang="ts">
import type { Snippet } from "svelte"
import type { Reorder } from "../../client/reorder.svelte.js"

interface Props {
	index: number
	count: number
	/** What the row is called to a screen reader, such as "Take from Funds". */
	label: string
	reorder: Reorder<unknown>
	/** Whether the person may change the order: the server answers, and the page is not the Demo. */
	editable: boolean
	/** A message at the row: the rule it breaks, or the CLI's refusal that names it. */
	problem?: string | undefined
	/** Runs when a row is dropped: the page saves the new order. */
	onDrop: (event: DragEvent, index: number) => void
	children: Snippet
	actions?: Snippet
}

let { index, count, label, reorder, editable, problem, onDrop, children, actions }: Props = $props()
const button =
	"rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
</script>

<!-- A row of an ordered list. Dragging is for a pointer; the up and down buttons are for a keyboard and a phone. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<li
	draggable={editable}
	ondragstart={(event) => reorder.start(event, index)}
	ondragover={(event) => reorder.hover(event, index)}
	ondrop={(event) => onDrop(event, index)}
	ondragend={() => reorder.end()}
	class="space-y-2 rounded-md border bg-card p-3 text-sm {reorder.over === index ? 'border-accent' : 'border-border'}"
>
	<div class="flex flex-wrap items-center justify-between gap-2">
		<span class="min-w-0 flex-1">{@render children()}</span>
		{#if editable}
			<span class="flex flex-wrap gap-1.5">
				<button type="button" class={button} disabled={index === 0} onclick={() => reorder.nudge(index, -1)}>
					Up<span class="sr-only">: move {label} up</span>
				</button>
				<button type="button" class={button} disabled={index === count - 1} onclick={() => reorder.nudge(index, 1)}>
					Down<span class="sr-only">: move {label} down</span>
				</button>
				{@render actions?.()}
			</span>
		{/if}
	</div>
	{#if problem}<p role="alert" class="text-sm text-destructive">{problem}</p>{/if}
</li>
