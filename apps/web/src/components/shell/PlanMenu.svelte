<script lang="ts">
import { focusedMenuItem, focusMenuItem, menuItemCount } from "../../client/menu"
import { menuTarget } from "../../lib/view/plans/menu"
import type { PlanRow } from "../../lib/view/plans/rows"
import PlanMenuList from "./PlanMenuList.svelte"

interface Props {
	names: readonly string[]
	selected: string
	rows: readonly PlanRow[]
	onChange: (name: string) => unknown
	/** Whether the server answers Edits, so the menu offers a new plan. */
	editable?: boolean
	/** Shuts the menu, and gives focus back to the button that opened it. */
	onClose: () => void
	/** The choice that takes focus as the menu opens: the plan the page shows. */
	initialIndex: number
}

let { names, selected, rows, onChange, editable = false, onClose, initialIndex }: Props = $props()
let menu: HTMLDivElement | undefined = $state()

// On opening, focus lands on the plan on screen, as a keyboard reader expects from a menu button.
$effect(() => {
	if (menu !== undefined) focusMenuItem(menu, initialIndex)
})

function onKeydown(event: KeyboardEvent): void {
	if (event.key === "Escape") {
		event.preventDefault()
		onClose()
		return
	}
	if (menu === undefined) return
	const next = menuTarget(event.key, focusedMenuItem(menu), menuItemCount(menu))
	if (next === null) return
	event.preventDefault()
	focusMenuItem(menu, next)
}
</script>

<!-- The plan menu (web ADR 0023): one choice for each plan, then the Plans page and a new plan. -->
<div
	bind:this={menu}
	role="menu"
	aria-label="Plans"
	tabindex="-1"
	onkeydown={onKeydown}
	class="absolute top-full left-0 z-30 mt-1 max-h-[70vh] w-64 max-w-[80vw] overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg"
>
	<PlanMenuList {names} {rows} {selected} {onChange} {editable} {onClose} />
</div>
