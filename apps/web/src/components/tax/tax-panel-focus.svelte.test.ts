import { describe, expect, test } from "bun:test"
import type { HouseholdDocument, ProjectionAllowances, Read } from "../../lib/contract"
import { ok, projectionRun } from "../../lib/view/compare/projection.test-support"
import { personNames } from "../../lib/view/item-names"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import { panel, year } from "./tax-panel.test-support"

/** The Demo's separate allowances read, its current year's saving replaced for each Filer. */
function savingsRead(savings: readonly [string, string]): Read<ProjectionAllowances> {
	const read = DEMO.reads.allowances["separate"]
	if (read?.ok !== true) throw new Error("the Demo has a separate allowances read")
	const current = read.data.taxYears.filter((one) => one.from === "2026-01-01")
	const me = current.find((one) => one.filer === "me")
	const partner = current.find((one) => one.filer === "partner")
	if (me === undefined || partner === undefined) throw new Error("both Returns have 2026")
	return {
		...read,
		data: {
			...read.data,
			taxYears: [
				{ ...me, saving: savings[0] },
				{ ...partner, saving: savings[1] },
			],
		},
	}
}

const RUN = projectionRun({
	taxYears: [
		year({ levy: "th-2026-pit@me", filer: "me", due: "80000.00", owed: "80000.00" }),
		year({ levy: "th-2026-pit@partner", filer: "partner", due: "4600.00", owed: "4600.00" }),
	],
})

const HOUSEHOLD: HouseholdDocument = {
	schemaVersion: 2,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 88 },
	],
	anchors: [],
	owners: [],
}

const PEOPLE = { separate: personNames(HOUSEHOLD) }
const ALLOWANCES = { separate: savingsRead(["1000.00", "0.00"]) }

describe("TaxPanel: the focus point of the Return on screen", () => {
	test("switches Return and follows it in the focus answer and the Save tax action", () => {
		const me = panel({ separate: ok(RUN) }, "separate", PEOPLE, {}, ALLOWANCES, "me")
		expect(me).toContain("How much tax for 2026? 80k THB")
		expect(me).toContain("You could still save 1k THB.")
		expect(me).toContain(">Save tax<")
		expect(me).toContain("th-2026-pit@me")

		const partner = panel({ separate: ok(RUN) }, "separate", PEOPLE, {}, ALLOWANCES, "partner")
		expect(partner).toContain("How much tax for 2026? 4.6k THB")
		expect(partner).not.toContain("You could still save")
		expect(partner).not.toContain(">Save tax<")
		expect(partner).toContain("th-2026-pit@partner")
	})
})
