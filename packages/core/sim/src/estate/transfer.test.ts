import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { transfer } from "../engine/test-transfer"
import type { Fixture } from "../fixtures/fixture"
import type { EstateStatement, Flow } from "../types"
import { household, withEstate } from "./test-household"

const AT = "2027-01-01"

function statement(flows: readonly Flow[]): EstateStatement {
	const base = withEstate(household(), {
		costs: [{ id: "legal", amount: 100_000, growth: "inflation" }],
	})
	const fixture: Fixture = { ...base, scenario: { ...base.scenario, flows } }
	const result = project(fixture.baseline, fixture.scenario, fixture.timeline, { estate: true })
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection.estate!.find((item) => item.date === AT)!
}

describe("the Estate statement and a transfer", () => {
	const none = statement([])

	// Cash 1,000,000 and a locked fund of 2,000,000: moving 600,000 between them changes no gross, debt or net.
	it("is unchanged by a transfer between two assets", () => {
		expect(statement([transfer("move", "cash", "fund", 600_000, { start: "2026-06-30" })])).toEqual(
			none,
		)
	})

	// Paying 1,000,000 of the 3,000,000 loan from cash takes 1,000,000 off gross and off debts: the net is the same.
	it("keeps its net when a transfer pays a liability down, gross and debts both falling", () => {
		const paid = statement([transfer("pay", "cash", "loan", 1_000_000, { start: "2026-06-30" })])
		expect([paid.gross, paid.debts]).toEqual([none.gross - 1_000_000, none.debts - 1_000_000])
		expect([paid.net, paid.toHeirs]).toEqual([none.net, none.toHeirs])
	})
})
