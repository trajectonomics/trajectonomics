import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"

import { preferences } from "../../client/preferences.svelte.js"
import type { ProjectionChance, Read } from "../../lib/contract"
import { chanceFixture } from "../../lib/view/chance/fixtures.test-support"
import { insideDetails, outsideDetails } from "../../lib/view/details.test-support"
import ChanceView from "./ChanceView.svelte"

const ARGV = ["projection", "chance", "--scenario=base", "--json"]

function renderView(
	chance: Readonly<Record<string, Read<ProjectionChance>>>,
	scenario = "",
): string {
	return render(ChanceView, {
		props: { names: Object.keys(chance), chance, scenario, onScenario: () => {} },
	}).body
}

describe("ChanceView", () => {
	test("shows the chance as the headline, with the markets beside it and the seed and model id in Details", () => {
		const body = renderView({ base: { argv: ARGV, ok: true, data: chanceFixture() } })
		expect(body).toContain("87%")
		expect(body).toContain("Lasts to 2028 in 174 of 200 markets.")
		const outside = outsideDetails(body)
		expect(outside).not.toContain("0123456789abcdef")
		expect(outside).not.toContain(">Seed<")
		expect(outside).not.toContain(">Return model<")
		const details = insideDetails(body)
		expect(details).toContain("0123456789abcdef")
		expect(details).toContain(">Seed<")
		expect(details).toContain(">Return model<")
		expect(body).toContain("Net worth Bands by year")
		expect(body).toContain("When the failing paths run out")
		expect(body).toContain("Every figure is nominal.")
	})

	test("shows the CLI's error for a failed read, with its command, and keeps the Scenario picker", () => {
		const body = renderView({
			base: {
				argv: ARGV,
				ok: false,
				error: { code: "projection_refused", exitCode: 3, message: "The engine refused." },
			},
		})
		expect(body).toContain("Chance of success for base could not be read")
		expect(body).toContain("The engine refused.")
		expect(body).toContain("projection_refused")
		expect(body).toContain('name="scenario"')
	})

	test("says how to add a Return model when these figures hold no chance read", () => {
		const body = renderView({})
		expect(body).toContain("No chance of success for this plan")
		expect(body).toContain("--return-model FILE")
		expect(body).toContain("--paths N")
		expect(body).toContain("--seed HEX")
	})
})

describe("ChanceView's Bands", () => {
	const TABLES = [
		{
			name: "bands" as const,
			count: 1,
			rows: [{ index: 0, to: "2026-12-31", p10: "1000.00", p50: "2000.00", p90: "3000.00" }],
		},
	]
	const REAL = chanceFixture().bands.map((band) => ({
		...band,
		netWorth: band.netWorth.map((percentile) => ({ ...percentile, value: "90000.00" })),
	}))

	test("offers Today's and Future money only when the CLI states the real Bands", () => {
		const withReal = renderView({
			base: { argv: ARGV, ok: true, data: chanceFixture({ tables: TABLES, realBands: REAL }) },
		})
		expect(withReal).toContain('name="money"')
		expect(withReal).toContain('value="today"')
		expect(withReal).toContain('value="future"')
		expect(withReal).toContain("Future money")
		const without = renderView({
			base: { argv: ARGV, ok: true, data: chanceFixture({ tables: TABLES }) },
		})
		expect(without).not.toContain('name="money"')
		expect(without).not.toContain("Future money")
	})

	test("opens on today's money, so the hidden Bands table carries the real figures", () => {
		const body = renderView({
			base: { argv: ARGV, ok: true, data: chanceFixture({ tables: TABLES, realBands: REAL }) },
		})
		const table = body.slice(body.indexOf('<div class="sr-only">'))
		expect(table).toContain("90,000.00")
		expect(table).not.toContain("2,000.00")
	})

	test("states the nominal Bands when the CLI states no real Bands", () => {
		const body = renderView({
			base: { argv: ARGV, ok: true, data: chanceFixture({ tables: TABLES }) },
		})
		const table = body.slice(body.indexOf('<div class="sr-only">'))
		expect(table).toContain("2,000.00")
	})
})

describe("ChanceView's text alternatives", () => {
	test("carries the Bands table and the runs-out counts in visually hidden tables", () => {
		const data = chanceFixture({
			tables: [
				{
					name: "bands",
					count: 1,
					rows: [{ index: 0, to: "2026-12-31", p10: "1000.00", p50: "2000.00", p90: "3000.00" }],
				},
			],
		})
		const body = renderView({ base: { argv: ARGV, ok: true, data } })
		expect(body).toContain('<div class="sr-only">')
		expect(body).toContain("Net worth Bands by roll-up end (")
		expect(body).toContain('<th scope="col">10th Percentile</th>')
		expect(body).toContain("2,000.00")
		expect(body).toContain('<th scope="row">31 Dec 2027</th>')
		expect(body).toContain("<td>12</td>")
	})

	test("names the currency in the Bands caption", () => {
		const body = renderView({ base: { argv: ARGV, ok: true, data: chanceFixture() } })
		expect(body).toContain("Net worth Bands by roll-up end (THB)")
	})

	test("with Hide amounts on, the hidden table carries no digits and says the amount is hidden", () => {
		const data = chanceFixture({
			tables: [
				{
					name: "bands",
					count: 1,
					rows: [{ index: 0, to: "2026-12-31", p10: "1000.00", p50: "2000.00", p90: "3000.00" }],
				},
			],
		})
		preferences.hidden = true
		try {
			const body = renderView({ base: { argv: ARGV, ok: true, data } })
			const table = body.slice(body.indexOf('<div class="sr-only">'))
			expect(table).not.toContain("2,000.00")
			expect(table).not.toContain("3,000.00")
			expect(table).toContain("amount hidden")
		} finally {
			preferences.hidden = false
		}
	})
})
