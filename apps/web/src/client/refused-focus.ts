// Where focus goes after a press whose button the page turned off while it waited: a browser drops focus to `body` with
// it, so it is handed to the field or the sentence that answers the press.
import { tick } from "svelte"

const MARKED = '[aria-invalid="true"]'
const SAID = '[role="alert"]'
const FIELD = "input:not([disabled]), select:not([disabled]), textarea:not([disabled])"

/** The element that holds focus, or null when none does, as on the server. */
export function focused(): HTMLElement | null {
	if (typeof document === "undefined") return null
	const active = document.activeElement
	return active === document.body ? null : (active as HTMLElement | null)
}

/** Waits for the form to place the answer, which it does after the Edit returns, and for Svelte to draw it. */
async function drawn(): Promise<void> {
	await new Promise((done) => setTimeout(done, 0))
	await tick()
}

/** Focuses an element, making a sentence able to take focus first. */
function take(node: HTMLElement): void {
	if (!node.matches(`${FIELD}, button, [tabindex]`)) node.tabIndex = -1
	node.focus()
}

/** The elements around a control, nearest first, up to its drawer or the page; the open drawer or the page without one. */
function around(control: HTMLElement | null): (Element | null)[] {
	const places: Element[] = []
	for (let node = control?.parentElement; node; node = node.parentElement) {
		places.push(node)
		if (node.matches("dialog, main")) break
	}
	if (places.length > 0) return places
	return [document.querySelector("dialog[open]") ?? document.querySelector("main")]
}

/** The first element any place holds, trying each selector within a place before the next place. */
function first(places: readonly (Element | null)[], selectors: string[]): HTMLElement | null {
	for (const place of places) {
		for (const selector of selectors) {
			const node = place?.querySelector<HTMLElement>(selector)
			if (node) return node
		}
	}
	return null
}

/**
 * After a refused Edit: focus goes to the first field the refusal marks, or to the sentence that says it. It stays where
 * it is when something else took it, such as a form's own alert. `pressed` is what held focus when the Edit was sent.
 */
export async function focusRefusal(pressed: HTMLElement | null): Promise<void> {
	if (typeof document === "undefined") return
	const places = around(pressed)
	await drawn()
	const now = focused()
	if (now !== null && now !== pressed) return
	const node = first(places, [MARKED, SAID]) ?? pressed
	if (node) take(node)
}

/**
 * After a Reload, whose notice goes with it. In a drawer, focus goes to the first marked field, or else the first field;
 * above a page, to the page. A Reload that failed lands on the sentence that says so.
 */
export async function focusReloaded(place: HTMLElement | null, ran: boolean): Promise<void> {
	await drawn()
	if (place === null || focused() !== null) return
	const drawer = place.matches("dialog")
	const wanted = ran ? (drawer ? [MARKED, FIELD] : []) : [SAID]
	take(first([place], wanted) ?? place)
}
