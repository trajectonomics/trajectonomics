import { moved, nudged, sameOrder } from "../lib/view/routing/order"

/** One row of the list: the item, and the position it had when the list was made, which names the row for as long as it is shown. */
export interface Row<T> {
	readonly key: number
	readonly item: T
}

/**
 * The order of a list a person is rearranging (web ADR 0022): by dragging a row, or by the up and down buttons that a
 * keyboard and a phone use. A drop returns the new order for the caller to save; a button changes the order here and waits
 * for "Done". Each row keeps its `key` as it moves, so the page keys its rows by it and focus follows the row that was
 * pressed: a second press moves the same row again, never the one that took its place.
 */
export class Reorder<T> {
	rows = $state.raw<readonly Row<T>[]>([])
	/** The row being dragged and the row it is over, by position. */
	dragging = $state<number | null>(null)
	over = $state<number | null>(null)

	constructor(initial: readonly T[]) {
		this.rows = initial.map((item, key) => ({ key, item }))
	}

	/** The items in their current order. */
	get items(): readonly T[] {
		return this.rows.map((row) => row.item)
	}

	/** Whether the order differs from the saved one. */
	changed(saved: readonly T[]): boolean {
		return !sameOrder(this.items, saved)
	}

	/** Starts dragging the row at `index`. Firefox needs data on the drag to start it. */
	start(event: DragEvent, index: number): void {
		event.dataTransfer?.setData("text/plain", String(index))
		if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
		this.dragging = index
	}

	/** Marks the row the drag is over, and allows a drop on it. */
	hover(event: DragEvent, index: number): void {
		if (this.dragging === null) return
		event.preventDefault()
		this.over = index
	}

	/** Drops the dragged row at `index`: the new order, or null when nothing was dragged or nothing moved. */
	drop(event: DragEvent, index: number): readonly T[] | null {
		event.preventDefault()
		const from = this.dragging
		this.dragging = null
		this.over = null
		if (from === null || from === index) return null
		this.rows = moved(this.rows, from, index)
		return this.items
	}

	/** Ends a drag that was not dropped on a row. */
	end(): void {
		this.dragging = null
		this.over = null
	}

	/** Moves the row with this key one place up (-1) or down (1). */
	press(key: number, by: -1 | 1): void {
		const index = this.rows.findIndex((row) => row.key === key)
		if (index >= 0) this.rows = nudged(this.rows, index, by)
	}

	/** Puts the saved order back. */
	reset(saved: readonly T[]): void {
		this.rows = saved.map((item, key) => ({ key, item }))
	}
}
