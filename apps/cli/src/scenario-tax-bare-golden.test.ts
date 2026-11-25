import { describe, expect, it } from "bun:test"
import { goldenJson, goldenTextIn, recordGoldenIn } from "./golden-test-support"
import type { Household } from "./scenario/household/model"
import {
	COUPLE_OWNERS,
	COUPLE_PLAN,
	couple,
	coupleHousehold,
	labelSavings,
	taxCouple,
} from "./scenario-tax-filers-support"
import { scenario } from "./scenario-test-support"

/*
 * A plan without a partner, or without Owners, writes the document it wrote before Filers existed
 * (cli ADR-0075, lead decision a). The golden was recorded from the build before this change, so
 * the bytes below are the old build's: the written document, the stored profile and what `scenario
 * tax` reported. Record again only deliberately, with TRAJ_UPDATE_GOLDEN=1.
 */
const GOLDENS = new URL("./scenario/fixtures/", import.meta.url)
const GOLDEN = "tax-bare-labels.output"

const HOLDER_ONLY: Household = {
	schemaVersion: 2,
	people: [{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }],
	anchors: [],
	owners: [{ path: "flows.salary", person: "me" }],
}

const { owners: _none, ...unowned } = coupleHousehold([])
const V1: Household = { ...unowned, schemaVersion: 1 }
const FILERS = "a household with a partner and Owners"

/** The plan's households, by what each lacks or states. */
const HOUSEHOLDS: Record<string, Household> = {
	"a version 1 household with a partner": V1,
	"a household with a partner and no Owners": coupleHousehold([]),
	"a household with Owners and no partner": HOLDER_ONLY,
	[FILERS]: coupleHousehold(COUPLE_OWNERS),
}

const STATUSES = [
	"single",
	"married_no_income_spouse",
	"married_separate",
	"married_separate_40_1_joint_rest",
	"married_joint",
]

/** What a tax write printed and stored, without the row's id, version and clock. */
async function pinned(home: string, status: string): Promise<unknown> {
	expect((await taxCouple(home, status)).code).toBe(0)
	const written = await labelSavings(home)
	expect(written.err).toBe("")
	const result = JSON.parse(written.out) as Record<string, unknown> & {
		scenario: Record<string, unknown>
	}
	const shown = JSON.parse((await scenario(home, ["show", "base"])).out) as {
		scenario: Record<string, unknown>
	}
	// The row's version counts the household's writes too, so it says nothing about the tax write.
	const { id: _id, createdAt: _c, updatedAt: _u, version: _v, ...row } = result.scenario
	return { ...result, scenario: row, tax: shown.scenario["tax"] }
}

/** The plan taxed under each of these statuses, in a household. */
async function outcomes(
	household: Household | null,
	statuses: readonly string[],
): Promise<Record<string, unknown>> {
	const outcome: Record<string, unknown> = {}
	for (const status of statuses) {
		outcome[status] = await pinned(await couple(COUPLE_PLAN, household), status)
	}
	return outcome
}

describe("a plan that keeps bare labels writes what it wrote before Filers", () => {
	it("pins the plan with no household, under every filing status", async () => {
		const outcome = await outcomes(null, STATUSES)
		await recordGoldenIn(GOLDENS, GOLDEN, outcome)
		expect(goldenJson(outcome)).toBe(await goldenTextIn(GOLDENS, GOLDEN))
	})

	for (const [name, household] of Object.entries(HOUSEHOLDS)) {
		// The last household gets Filers on both married statuses; its other statuses keep bare labels.
		const statuses =
			name === FILERS
				? STATUSES.filter((it) => it !== "married_joint" && it !== "married_separate")
				: STATUSES
		it(`writes those same bytes for ${name}`, async () => {
			const golden = JSON.parse(await goldenTextIn(GOLDENS, GOLDEN)) as Record<string, unknown>
			const outcome = await outcomes(household, statuses)
			for (const status of statuses) expect(outcome[status]).toEqual(golden[status])
		})
	}
})
