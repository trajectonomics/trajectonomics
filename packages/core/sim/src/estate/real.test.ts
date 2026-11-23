import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { growingHousehold, withEstate } from "./test-household"

describe("an estate's real net is the row's realNetWorth when nothing is taken off", () => {
	it.each([false, true])(
		"states real.net = realNetWorth on every row (loan repaid: %p)",
		(repaid) => {
			const fixture = withEstate(growingHousehold(repaid), {})
			const result = project(fixture.baseline, fixture.scenario, fixture.timeline, { estate: true })
			if (!result.ok) throw new Error(JSON.stringify(result.problems))
			const { rows, estate } = result.projection
			expect(rows.length).toBe(721)
			rows.forEach((row, index) => {
				const at = estate![index]!
				expect([row.date, at.net]).toEqual([row.date, row.netWorth])
				expect([row.date, at.real.net]).toEqual([row.date, row.realNetWorth])
				expect(at.real.toHeirs).toBe(at.net > 0 ? at.real.net : 0)
			})
		},
	)
})
