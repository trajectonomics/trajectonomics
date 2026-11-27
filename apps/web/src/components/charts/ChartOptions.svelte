<script lang="ts">
import { focusOnNextFrame } from "../../client/browser"
import { subscribeOutsideClick } from "../../client/menu"
import type { ChartDef } from "../../lib/view/charts/types"
import NavIcon from "../shell/NavIcon.svelte"
import ChartFiles from "./ChartFiles.svelte"
import ChartPicker from "./ChartPicker.svelte"

interface Props {
	charts: readonly ChartDef[]
	/** The id of the chosen custom chart, or "" for the net worth chart. */
	value: string
	onChange: (id: string) => void
	onNew: () => void
	onExport: () => void
	onImport: (file: File) => void
	hasCharts: boolean
	/** Bumped by the page after a save or a delete, when this button takes focus back. */
	focusWhen?: number
}

/** The chart picker and the chart files, behind one icon button at the chart's top right. */
let { charts, value, onChange, onNew, onExport, onImport, hasCharts, focusWhen }: Props = $props()
const panelId = $props.id()
let open = $state(false)
let root: HTMLDivElement | undefined = $state()
let button: HTMLButtonElement | undefined = $state()
// svelte-ignore state_referenced_locally
const firstFocusWhen = focusWhen ?? 0

function close(): void {
	open = false
	button?.focus()
}

function onKey(event: KeyboardEvent): void {
	if (event.key !== "Escape" || !open) return
	event.preventDefault()
	close()
}

// A click outside the button and its panel shuts it; Escape shuts it through the key handler.
$effect(() => {
	if (!open || root === undefined) return
	return subscribeOutsideClick(root, () => (open = false))
})

// A chart saved or deleted swaps the page's chart, so focus would be lost: the button takes it once the
// drawer has closed and put its own focus back.
$effect(() => {
	if (focusWhen === undefined || focusWhen <= firstFocusWhen) return
	focusOnNextFrame(button)
})
</script>

<svelte:window onkeydown={onKey} />

<div bind:this={root} class="relative">
	<button
		type="button"
		bind:this={button}
		aria-label="Charts"
		aria-expanded={open}
		aria-controls={panelId}
		onclick={() => (open = !open)}
		class="relative inline-flex rounded-md border border-border bg-card p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
	>
		<NavIcon name="chart-line" />
	</button>
	{#if open}
		<div
			id={panelId}
			class="absolute right-0 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] space-y-3 rounded-lg border border-border bg-card p-3 shadow-lg"
		>
			<ChartPicker id={`${panelId}-chart`} {charts} {value} {onChange} {onNew} />
			<ChartFiles {hasCharts} {onExport} {onImport} />
		</div>
	{/if}
</div>
