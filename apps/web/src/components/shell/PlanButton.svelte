<script lang="ts">
import { subscribeOutsidePointer } from "../../client/menu"
import { planButtonName } from "../../lib/view/plans/menu"
import type { PlanRow } from "../../lib/view/plans/rows"
import Badge from "../ui/Badge.svelte"
import { cx } from "../ui/cx"
import NavIcon from "./NavIcon.svelte"
import PlanMenu from "./PlanMenu.svelte"

interface Props {
	/** The Scenario names the Snapshot holds, the main plan first. */
	names: readonly string[]
	/** The Scenario the pages show. */
	selected: string
	/** Returns false when the page refused the switch: the menu then still marks the old plan. */
	onChange: (name: string) => unknown
	/** Whether the server answers Edits, so the menu offers a new plan. */
	editable?: boolean
	/** What the Snapshot says of each plan, for the Main tag. */
	rows?: readonly PlanRow[]
}

let { names, selected, onChange, editable = false, rows = [] }: Props = $props()
let open = $state(false)
let root: HTMLDivElement | undefined = $state()
let button: HTMLButtonElement | undefined = $state()
const main = $derived(rows.find((row) => row.name === selected)?.main === true)
const label = $derived(planButtonName(selected))

/** Shuts the menu and gives focus back to the button, wherever the person was in the menu. */
function hide(): void {
	open = false
	button?.focus()
}

function onButtonKey(event: KeyboardEvent): void {
	if (event.key === "Escape") {
		if (open) hide()
		return
	}
	if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
	event.preventDefault()
	open = true
}

// A press outside the button and its menu shuts the menu; Escape shuts it through the key handlers.
$effect(() => {
	if (!open || root === undefined) return
	return subscribeOutsidePointer(root, hide)
})
</script>

<!-- The plan switcher: one button that names the plan the pages show, and a menu that picks another. -->
<div bind:this={root} class="relative min-w-0">
	<button
		type="button"
		bind:this={button}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label={label}
		title="Change plan"
		onclick={() => (open ? hide() : (open = true))}
		onkeydown={onButtonKey}
		class="flex h-[34px] max-w-full min-w-0 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
	>
		<span class="shrink-0 text-xs text-muted-foreground">Plan</span>
		{#if selected !== ""}
			<span class="min-w-0 truncate">{selected}</span>
		{/if}
		{#if main}<Badge tone="accent">Main</Badge>{/if}
		<span class={cx("shrink-0 transition-transform", open && "rotate-180")}>
			<NavIcon name="chevron-down" />
		</span>
	</button>
	{#if open}
		<PlanMenu
			initialIndex={Math.max(0, names.indexOf(selected))}
			{names}
			{rows}
			{selected}
			{onChange}
			{editable}
			onClose={hide}
		/>
	{/if}
</div>
