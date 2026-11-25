// The fence of the hosted Demo (web ADR 0028): every control that would change a plan stays on the page and is switched
// off, with a title that says what it would do and where to do it. The loopback build never imports this file.
import { disabledTitle } from "../components/hosted/message"

/** The controls a visitor keeps: they choose what the page shows, and send nothing. Everything else in the fenced regions is switched off. */
const READ_CONTROLS = [
	"[aria-pressed]",
	"[aria-expanded]",
	'input[type="radio"][name="scenario"]',
	'input[type="radio"][name="terms"]',
	'input[type="radio"][name="plan-range"]',
	'select[name="year"]',
	'select[name="account"]',
	'select[name="table"]',
	'select[id$="-select"]',
	'input[name="memo"]',
	'ul[aria-labelledby="plan-switcher"] li > div:first-child > button',
].join(",")

/** Where the fence applies: the page, and the plan switcher beside it. A dialog is left alone: a switched-off control is the only way to open an Edit drawer, and the charts' own drawer keeps a person's charts in their own browser. */
const FENCED = "main, div:has(> #plan-switcher)"

/** Pages whose controls all read: the report picker, the downloads and Print. */
const READ_PAGES: readonly string[] = ["/reports/"]

/** What a control is called to a person: its label, its own text or the label that names it. */
function nameOf(control: Element): string {
	const labelled = control.getAttribute("aria-label")
	if (labelled !== null && labelled !== "") return labelled
	const own = control.textContent?.trim().replace(/\s+/g, " ")
	if (own !== undefined && own !== "") return own
	const id = control.getAttribute("id")
	const label = id === null ? null : document.querySelector(`label[for="${CSS.escape(id)}"]`)
	return label?.textContent?.trim() ?? "This control"
}

function switchOff(control: HTMLElement): void {
	control.setAttribute("disabled", "")
	control.setAttribute("title", disabledTitle(nameOf(control)))
	// Inline, so the look needs no class of the loopback build's stylesheet: a button without a disabled style still reads as off.
	control.style.opacity = "0.5"
	control.style.cursor = "not-allowed"
}

/** Whether a control is left on: a read control, or anything in a dialog. */
function keptOn(control: Element): boolean {
	return control.closest("dialog") !== null || control.matches(READ_CONTROLS)
}

/** Switches off the controls of one region, and stops its rows being dragged. */
function fenceRegion(region: Element): void {
	// A row that can be dragged to reorder is an Edit too: it stops being draggable.
	for (const row of region.querySelectorAll("[draggable='true']"))
		row.setAttribute("draggable", "false")
	for (const control of region.querySelectorAll<HTMLElement>("button, input, select, textarea")) {
		if (!keptOn(control) && !(control.hasAttribute("disabled") && control.hasAttribute("title")))
			switchOff(control)
	}
}

/** Switches off every control under the fenced regions that is not a read control. Safe to run again. */
export function fence(root: ParentNode, pathname: string): void {
	if (READ_PAGES.some((page) => pathname.endsWith(page))) return
	for (const region of root.querySelectorAll(FENCED)) fenceRegion(region)
}

/** Fences the document now and again whenever the page changes. Returns the stop. */
export function keepFenced(root: HTMLElement): () => void {
	const run = (): void => fence(root, window.location.pathname)
	run()
	const observer = new MutationObserver(run)
	observer.observe(root, { childList: true, subtree: true })
	return () => observer.disconnect()
}
