// The fence of the hosted Demo (web ADR 0028): every control that would change a plan stays on the page and is switched
// off, with a title that says what it would do and where to do it. The loopback build never imports this file.
import { disabledTitle } from "../components/hosted/message"

/** The controls a visitor keeps: they choose what the page shows, and send nothing. Everything else in the fenced regions is switched off. */
const READ_CONTROLS = [
	// A toggle inside an Edit form fills a switched-off field (the swing choices), so it is not a read control.
	"[aria-pressed]:not(form *)",
	"[aria-expanded]",
	'input[type="radio"][name="scenario"]',
	'input[type="radio"][name="terms"]',
	'input[type="radio"][name="plan-range"]',
	'select[name="year"]',
	'select[name="account"]',
	'select[name="table"]',
	'select[id$="-select"]',
	// The estate page's date only sets `?estate=`, and reads an old `?at=` link in its place.
	"select#estate-date",
	// A visitor's own charts live in this browser's localStorage only: editing, copying, deleting, exporting and importing send nothing.
	'[role="group"][aria-label="This chart"] button',
	// The Plan's tabs and its compact cards only choose what the page shows; the cards open a read of the facts.
	'[role="tab"]',
	"[data-plan-item]",
	'input[type="file"][accept="application/json,.json"]',
	'div:has(> label > input[type="file"][accept="application/json,.json"]) > button',
	'input[name="memo"]',
	// The plan menu's choices only pick the plan the pages show; "New plan" beside them is an Edit.
	'[role="menuitemradio"]',
	// The guided first plan computes nothing and writes nothing until Save, which a hosted page never draws: its
	// steps, fields and switches only fill the form in this browser's memory.
	"[data-guided] :is(input, select, button)",
].join(",")

/** Where the fence applies: the page, and the plan menu in the top bar, which sits outside `main`. A dialog is left alone: a switched-off control is the only way to open an Edit drawer, and the charts' own drawer keeps a person's charts in their own browser. */
const FENCED = 'main, [role="menu"][aria-label="Plans"]'
/** The plan menu, outside `main`: its New plan is an Edit on every page, a read page's too. */
const PLAN_MENU = '[role="menu"][aria-label="Plans"]'

/** Pages whose controls all read: the report picker, the downloads and Print. */
const READ_PAGES: readonly string[] = ["/reports/"]

/** The text of a label without the fields inside it (a wrapped select would otherwise add all of its options). */
function labelText(label: Element): string {
	const copy = label.cloneNode(true) as Element
	for (const field of copy.querySelectorAll("input, select, textarea, option")) field.remove()
	return copy.textContent?.trim().replace(/\s+/g, " ") ?? ""
}

/** What a field is called to a person: its aria-label, the label that names it, or the label it sits in. */
function fieldName(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
	const named = control.getAttribute("aria-label")
	if (named !== null && named !== "") return named
	for (const label of control.labels ?? []) {
		const text = labelText(label)
		if (text !== "") return text
	}
	const wrapping = control.closest("label")
	return wrapping === null ? "" : labelText(wrapping)
}

/** What a control is called to a person: a button by its label or its own text, a field by the label that names it. */
function nameOf(control: Element): string {
	const labelled = control.getAttribute("aria-label")
	if (labelled !== null && labelled !== "") return labelled
	const field =
		control instanceof HTMLInputElement ||
		control instanceof HTMLSelectElement ||
		control instanceof HTMLTextAreaElement
	const name = field ? fieldName(control) : (control.textContent?.trim().replace(/\s+/g, " ") ?? "")
	return name === "" ? "This control" : name
}

/** Sets an attribute only when it differs, so the fence's own writes do not wake the observer again once the page has settled. */
function setOnce(element: Element, name: string, value: string): void {
	if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}

function switchOff(control: HTMLElement): void {
	setOnce(control, "disabled", "")
	setOnce(control, "title", disabledTitle(nameOf(control)))
	// Inline, so the look needs no class of the loopback build's stylesheet: a button without a disabled style still reads as off.
	if (control.style.opacity !== "0.5") control.style.opacity = "0.5"
	if (control.style.cursor !== "not-allowed") control.style.cursor = "not-allowed"
}

/** Whether a control is left on: a read control, or anything in a dialog. */
function keptOn(control: Element): boolean {
	return control.closest("dialog") !== null || control.matches(READ_CONTROLS)
}

/** A menu that opens still opens, but says the same as the items it holds that are switched off. */
function titleMenus(region: Element): void {
	for (const summary of region.querySelectorAll<HTMLElement>("details > summary")) {
		if (summary.parentElement?.querySelector(":scope button[disabled][title]") == null) continue
		setOnce(summary, "title", disabledTitle(nameOf(summary)))
	}
}

/** Switches off the controls of one region, and stops its rows being dragged. */
function fenceRegion(region: Element): void {
	// A row that can be dragged to reorder is an Edit too: it stops being draggable.
	for (const row of region.querySelectorAll("[draggable='true']"))
		setOnce(row, "draggable", "false")
	for (const control of region.querySelectorAll<HTMLElement>("button, input, select, textarea")) {
		if (!keptOn(control) && !(control.hasAttribute("disabled") && control.hasAttribute("title")))
			switchOff(control)
	}
	titleMenus(region)
}

/** Switches off every control under the fenced regions that is not a read control. Safe to run again. */
export function fence(root: ParentNode, pathname: string): void {
	const regions = READ_PAGES.some((page) => pathname.endsWith(page)) ? PLAN_MENU : FENCED
	for (const region of root.querySelectorAll(regions)) fenceRegion(region)
}

/** Fences the document now and again whenever the page changes. Returns the stop. */
export function keepFenced(root: HTMLElement): () => void {
	const run = (): void => fence(root, window.location.pathname)
	run()
	const observer = new MutationObserver(run)
	// A control the page enables again, or a row it makes draggable again, is fenced again: the fence's own writes settle
	// at once, because each one is made only when it changes something.
	observer.observe(root, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ["disabled", "draggable"],
	})
	return () => observer.disconnect()
}
