import type { Page } from "@playwright/test"

/** A chart of a visitor's own, seeded into `localStorage` before the page loads so its Edit, Duplicate and Delete buttons are on the page. */
export const SEEDED_CHART = "spend"

/** Seeds one chart into the page's storage, in the document the chart store reads. Call it before the first `goto`. */
export async function seedChart(page: Page): Promise<void> {
	await page.addInitScript((id) => {
		localStorage.setItem(
			"traj.charts",
			JSON.stringify({
				format: "trajectonomics-charts",
				version: 1,
				charts: [{ id, name: "Spend", kind: "stacked-bars", series: ["income", "expenses"] }],
			}),
		)
	}, SEEDED_CHART)
}

/** What the page says of one control that is on: the raw parts of the line that names it. */
interface Raw {
	readonly tag: string
	readonly type: string | null
	readonly name: string | null
	readonly id: string | null
	readonly value: string
	readonly aria: string | null
	readonly own: string
	readonly label: string
}

/**
 * Every control on the page that is on (not disabled) and outside a dialog, as a line that names it: tag, type, `name`,
 * radio value, id and the words a person reads (aria-label, a button's own text, or a field's label). The same control
 * has the same line in the loopback build and the hosted one, so the two lists compare.
 */
export async function enabledControls(page: Page): Promise<string[]> {
	const raw = await page.evaluate((): Raw[] => {
		const text = (node: Element | null | undefined): string =>
			(node?.textContent ?? "").replace(/\s+/g, " ").trim()
		const on = (c: HTMLElement): boolean =>
			!(c as HTMLButtonElement).disabled && !c.closest("dialog")
		return [...document.querySelectorAll<HTMLElement>("button, input, select, textarea")]
			.filter(on)
			.map((c) => ({
				tag: c.tagName.toLowerCase(),
				type: c.getAttribute("type"),
				name: c.getAttribute("name"),
				id: c.getAttribute("id"),
				value: (c as HTMLInputElement).value ?? "",
				aria: c.getAttribute("aria-label"),
				own: c instanceof HTMLButtonElement ? text(c) : "",
				label: text((c as HTMLInputElement).labels?.[0] ?? c.closest("label")),
			}))
	})
	return raw.map((c) =>
		[
			c.tag,
			c.type ?? "",
			c.name ?? "",
			c.type === "radio" ? c.value : "",
			c.id ?? "",
			c.aria ?? (c.own || c.label),
		].join("|"),
	)
}
