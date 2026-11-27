import type { Page } from "@playwright/test"

/** The three headline figures at phone width: their top edges, and how far each value spills out of its cell. */
export interface StatFit {
	readonly tops: readonly number[]
	readonly over: readonly number[]
}

/**
 * Measures the Plan's three figures: each link's top edge (one row when all three agree), and how much
 * wider than its cell each figure's line is (0 when it fits).
 */
export function measureStats(page: Page): Promise<StatFit> {
	return page.evaluate(() => {
		const links = ["/fi/", "/projection/years/", "/chance/"].map((href) =>
			document.querySelector(`main a[href^="${href}"]`),
		)
		const values = links.map((link) => link?.querySelector("p.tabular-nums") ?? null)
		return {
			tops: links.map((link) => link?.getBoundingClientRect().top ?? -1),
			over: values.map((value) => (value === null ? -1 : value.scrollWidth - value.clientWidth)),
		}
	})
}
