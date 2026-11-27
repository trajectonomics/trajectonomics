<script lang="ts">
import { type PlanTab, type PlanTabInfo, tabIndexFor } from "../../lib/view/plan-items/tabs"

interface Props {
	/** The tabs, in the order they are laid out, each with its count. */
	tabs: readonly PlanTabInfo[]
	selected: PlanTab
	/** Selects a tab: the page writes it to the address bar, and the panel follows. */
	onSelect: (tab: PlanTab) => void
}

/** The Plan's tab strip, keyboard operable as WAI-ARIA tabs: arrows move and wrap, Home and End jump. */
let { tabs, selected, onSelect }: Props = $props()
let buttons: (HTMLButtonElement | undefined)[] = $state([])

function choose(tab: PlanTab, index: number): void {
	onSelect(tab)
	buttons[index]?.focus()
}

/** Only the keys the tabs own move the selection; every other key is the browser's. */
function onKey(event: KeyboardEvent, index: number): void {
	const next = tabIndexFor(tabs.length, index, event.key)
	const tab = next === null ? undefined : tabs[next]
	if (next === null || tab === undefined) return
	event.preventDefault()
	choose(tab.id, next)
}
</script>

<div class="relative max-w-full overflow-x-auto">
	<div role="tablist" aria-label="Plan items" class="flex min-w-max gap-1 border-b border-border">
		{#each tabs as tab, index (tab.id)}
			<button
				type="button"
				role="tab"
				id="plan-tab-{tab.id}"
				aria-selected={selected === tab.id}
				aria-controls="plan-items-panel"
				tabindex={selected === tab.id ? 0 : -1}
				bind:this={buttons[index]}
				onclick={() => onSelect(tab.id)}
				onkeydown={(event) => onKey(event, index)}
				class="rounded-t-md px-3 py-2 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring {selected === tab.id
					? 'border-b-2 border-accent font-semibold text-foreground'
					: 'text-muted-foreground hover:text-foreground'}"
			>
				{tab.label}
				<span class="ml-1 text-xs tabular-nums">{tab.count}</span>
			</button>
		{/each}
	</div>
</div>
