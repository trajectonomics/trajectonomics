import { describe, expect, it } from "bun:test"
import { emitThLevy } from "@trajectonomics/core/tax/th"
import { carryInFile, MID_PERIOD, thRecord } from "./projection/carry-in-support"
import { errorOf, projection } from "./projection/testing"
import { runBody } from "./projection-run-support"
import {
	COUPLE_OWNERS,
	COUPLE_PLAN,
	couple,
	coupleHousehold,
	taxCouple,
} from "./scenario-tax-filers-support"

/*
 * A Levy over Filers reads Filer labels, so a hand-written Carry-in names them (cli ADR-0075): the
 * 29 classes of a Levy today (22 income, 7 allowance) once for each Filer, and the 22 income classes
 * under `@shared`. An allowance is a person's own, so no allowance class is shared (tax ADR-0009).
 */

/** The classes the Thai Levy of two Filers on a joint Return reads. */
const CLASSES = emitThLevy({
	filingStatus: "married_joint",
	allowances: { children: { totalCount: 0, secondPlusBorn2018OrLaterCount: 0 } },
	levy: { id: "th-2026-pit" },
	filers: ["me", "partner"],
}).measures.filter((measure) => measure.op === "tally")

/** A joint Return of the couple, taxed, and its home. */
async function filerHome(): Promise<string> {
	const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
	expect((await taxCouple(home, "married_joint")).code).toBe(0)
	return home
}

const RUN = ["run", "--scenario", "base", ...MID_PERIOD]

describe("a Carry-in for a Levy with Filers", () => {
	it("reads 29 classes per Filer and the 22 income classes under @shared, 80 where a Levy had 29", async () => {
		expect(CLASSES).toHaveLength(80)
		const home = await filerHome()
		const res = await projection(home, RUN)
		expect(res.code).toBe(2)
		const { details } = errorOf(res) as { details: { missing: { label: string }[] } }
		expect(details.missing).toHaveLength(80)
		const suffixes = details.missing.map((it) => it.label.split("@")[1])
		expect(suffixes.filter((it) => it === "me")).toHaveLength(29)
		expect(suffixes.filter((it) => it === "partner")).toHaveLength(29)
		expect(suffixes.filter((it) => it === "shared")).toHaveLength(22)
	})

	it("takes a record that names Filer labels, and echoes it", async () => {
		const home = await filerHome()
		const record = thRecord({
			tallies: [
				{ label: "income.section40_1@me", basis: "gross", amount: "400000.00" },
				{ label: "income.section40_1@partner", basis: "gross", amount: "200000.00" },
			],
		})
		const res = await projection(home, [...RUN, "--carry-in", carryInFile(home, [record])])
		expect(res.code).toBe(0)
		const [echoed] = runBody(res).carryIn ?? []
		expect(echoed?.tallies).toHaveLength(80)
		expect(echoed?.tallies.find((it) => it.label === "income.section40_1@me")?.amount).toBe(
			"400000.00",
		)
	})

	it("refuses a bare label, which a Levy over Filers does not read", async () => {
		const home = await filerHome()
		const res = await projection(home, [...RUN, "--carry-in", carryInFile(home, [thRecord()])])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "document.0.tallies.0.label",
		})
	})
})
