import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"

import type { ProjectionChance } from "../../lib/contract"
import { chanceWithOutcomes, pathFixture } from "../../lib/view/chance/futures.test-support"
import ChanceFigures from "./ChanceFigures.svelte"
import ChanceView from "./ChanceView.svelte"
import PathResult from "./path/PathResult.svelte"

const NOMINAL = chanceWithOutcomes()
const REAL = chanceWithOutcomes({ realBands: NOMINAL.bands })
const FAN = "Net worth Bands by year, from the 10th to the 90th Percentile"
const CAPTION = "Net worth Bands by roll-up end (THB)"

/** The markup without Svelte's hydration comments, so a label can be matched right after its heading. */
const markup = (body: string): string => body.replace(/<!--.*?-->/g, "")

function page(data: ProjectionChance): string {
	const chance = { base: { argv: ["projection", "chance"], ok: true as const, data } }
	const props = { names: ["base"], chance, scenario: "base", onScenario: () => {} }
	return markup(render(ChanceView, { props }).body)
}

function pathPage(chance: ProjectionChance): string {
	const props = { path: pathFixture(2), chance, plan: "base", names: new Map<string, string>() }
	const rest = { terms: "both", onTerms: () => {}, argv: ["projection", "path"] }
	return markup(render(PathResult, { props: { ...props, ...rest } }).body)
}

/** A line that says "Future money" straight after the closing tag of a heading with this text. */
const under = (heading: string): RegExp =>
	new RegExp(`${heading}</h[23]>\\s*<p[^>]*>Future money</p>`)

describe("the Chance page says which money each figure is in", () => {
	test("labels the futures as future money only when the read also states today's money", () => {
		const body = page(REAL)
		for (const heading of ["Futures worth a look", "A typical future", "Every future"]) {
			expect(body).toMatch(under(heading))
		}
		expect(body).toContain("Every future, by closing net worth, in THB. Future money")
		const without = page(NOMINAL)
		expect(without).toContain("Every future, by closing net worth, in THB</caption>")
		expect(without).not.toContain("Future money")
	})

	test("labels a future's own closing and lowest figures the same way", () => {
		const header = /<p[^>]*>Future money<\/p>\s*<dl/
		expect(pathPage(REAL)).toMatch(header)
		expect(pathPage(NOMINAL)).not.toMatch(header)
	})

	test("names the chosen money on the fan, on its table and on paper, and nothing without a choice", () => {
		const body = page(REAL)
		expect(body).toContain(`aria-label="${FAN}, Today's money"`)
		expect(body).toContain(`<caption>${CAPTION}, Today's money</caption>`)
		expect(body).toMatch(/<p class="hidden[^"]*print:block">Bands in today's money<\/p>/)
		const without = page(NOMINAL)
		expect(without).toContain(`aria-label="${FAN}"`)
		expect(without).toContain(`<caption>${CAPTION}</caption>`)
		expect(without).not.toContain("Bands in ")
	})

	test("captions the Bands table with whichever money it is given", () => {
		for (const money of ["Today's money", "Future money"]) {
			const props = { bandRows: [], runsOut: [], currency: "THB", money }
			const body = markup(render(ChanceFigures, { props }).body)
			expect(body).toContain(`<caption>${CAPTION}, ${money}</caption>`)
		}
	})
})
