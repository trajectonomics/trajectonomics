<script lang="ts">
import { moved, type OrderChoice, toggled } from "../../lib/view/allowances"

interface Props {
	/** The allowances in the person's order. The parent holds it. */
	order: OrderChoice[]
	problem?: string | undefined
}

let { order = $bindable(), problem }: Props = $props()
const small =
	"rounded-md border border-border bg-card px-2 py-1 text-xs outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
</script>

<!-- The allowances, one per line: on or off, and a place up or down. The order is the order they fill in. -->
<ol class="space-y-2" aria-label="Your order">
	{#each order as choice, index (choice.label)}
		<li class="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
			<label class="flex flex-1 items-center gap-2">
				<input
					type="checkbox"
					checked={choice.on}
					onchange={() => (order = toggled(order, choice.label))}
				/>
				<span>{choice.name}</span>
			</label>
			<button type="button" class={small} disabled={index === 0} aria-label="Move {choice.name} up" onclick={() => (order = moved(order, choice.label, -1))}>Up</button>
			<button type="button" class={small} disabled={index === order.length - 1} aria-label="Move {choice.name} down" onclick={() => (order = moved(order, choice.label, 1))}>Down</button>
		</li>
	{/each}
</ol>
{#if problem}<p role="alert" class="text-sm text-destructive">{problem}</p>{/if}
