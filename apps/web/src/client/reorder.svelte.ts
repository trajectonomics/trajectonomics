import { moved, nudged, sameOrder } from "../lib/view/routing/order"

/**
 * The order of a list a person is rearranging (web ADR 0021): by dragging a row, or by the up and down buttons that a
 * keyboard and a phone use. A drop returns the new order for the caller to save; a button changes the order here and waits
 * for "Done". Only the order is held: each item is the document's own value.
 */
export class Reorder<T> {
	order = $state.raw<readonly T[]>([])
	/** The row being dragged and the row it is over, by position. */
	dragging = $state<number | null>(null)
	over = $state<number | null>(null)

	constructor(initial: readonly T[]) {
		this.order = initial
	}

	/** Whether the order differs from the saved one. */
	changed(saved: readonly T[]): boolean {
		return !sameOrder(this.order, saved)
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
		this.order = moved(this.order, from, index)
		return this.order
	}

	/** Ends a drag that was not dropped on a row. */
	end(): void {
		this.dragging = null
		this.over = null
	}

	/** Moves the row at `index` one place up (-1) or down (1). */
	nudge(index: number, by: -1 | 1): void {
		this.order = nudged(this.order, index, by)
	}

	/** Puts the saved order back. */
	reset(saved: readonly T[]): void {
		this.order = saved
	}
}
