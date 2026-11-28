import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { pathFixture } from "../../../lib/view/chance/futures.test-support"
import { pathRowsOf } from "../../../lib/view/chance/path-rows"
import PathTable from "./PathTable.svelte"

const accounts = ["Fund"]

/** The table of one path, with its returns given the inflation the CLI would state. */
function renderTable(inflation: number | null): string {
	const path = pathFixture(0)
	const returns =
		inflation === null
			? path.returns
			: path.returns.map((rollup) => ({ ...rollup, inflationBps: inflation }))
	const rows = pathRowsOf({ ...path, returns }, null)
	return render(PathTable, {
		props: { rows, accounts, terms: "both", inflation: inflation !== null, currency: "THB" },
	}).body
}

describe("PathTable", () => {
	test("shows the Inflation column, with each year's drawn rate, when the CLI states one", () => {
		const body = renderTable(250)
		expect(body).toContain(">Inflation</th>")
		expect(body).toContain("2.50%")
	})

	test("leaves the column out when the CLI states no inflation", () => {
		const body = renderTable(null)
		expect(body).not.toContain(">Inflation</th>")
		expect(body).toContain(">Age</th>")
	})
})
