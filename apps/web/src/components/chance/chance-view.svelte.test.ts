import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"

import type { ProjectionChance, Read } from "../../lib/contract"
import { chanceFixture } from "../../lib/view/chance/fixtures.test-support"
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
	test("shows the success share as the headline, with the paths, seed and model id beside it", () => {
		const body = renderView({ base: { argv: ARGV, ok: true, data: chanceFixture() } })
		expect(body).toContain("87.00%")
		expect(body).toContain("174 of 200 seeded Market paths never run out before 31 Dec 2028.")
		expect(body).toContain("0123456789abcdef")
		expect(body).toContain("illustrative-demo-model")
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

	test("says how to add a Return model when the Snapshot holds no chance read", () => {
		const body = renderView({})
		expect(body).toContain("No chance of success in this Snapshot")
		expect(body).toContain("--return-model FILE")
		expect(body).toContain("--paths N")
		expect(body).toContain("--seed HEX")
	})
})
