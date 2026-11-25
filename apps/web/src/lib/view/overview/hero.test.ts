import { describe, expect, test } from "bun:test"
import type {
	Fi,
	HouseholdDocument,
	ProjectionChance,
	ScenarioShow,
	Snapshot,
} from "../../contract"
import { chanceFixture } from "../chance/fixtures.test-support"
import { fiFixture, REACHABLE, UNREACHABLE } from "../fi/fixtures.test-support"
import { noteAnchor } from "../projection/notes"
import { heroOf, isWarningNote, warningsLabel } from "./hero"

const PLAN = "base"

const HOUSEHOLD: HouseholdDocument = {
	schemaVersion: 2,
	people: [{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }],
	anchors: [],
	owners: [],
}

const PAIR: HouseholdDocument = {
	schemaVersion: 2,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 88 },
	],
	anchors: [],
	owners: [],
}

/** A reachable FI answer with the ages and date the CLI states. */
function reachable(ages: { person: string; age: number }[] = [], fiDate = "2041-03-01"): Fi {
	const base = fiFixture(REACHABLE)
	if (!base.fi.reachable) throw new Error("the fixture is reachable")
	return { ...base, fi: { ...base.fi, fiDate, ages } }
}

/** A Snapshot with only the Reads Home's hero reads, cast because the other Reads do not matter here. */
function snapshotOf(
	fi: Fi,
	options: { chance?: ProjectionChance; household?: HouseholdDocument | null } = {},
): Snapshot {
	const chance =
		options.chance === undefined
			? {}
			: { [PLAN]: { argv: ["projection", "chance", PLAN], ok: true, data: options.chance } }
	const documents =
		options.household === undefined
			? {}
			: {
					[PLAN]: {
						argv: ["scenario", "show", PLAN],
						ok: true,
						data: { scenario: { household: options.household } } as unknown as ScenarioShow,
					},
				}
	return {
		snapshotVersion: 1,
		params: {
			asOf: "2026-10-31",
			horizon: "2060-12-31",
			scenarios: [PLAN],
			compare: null,
			birthDate: null,
			ages: [],
			historyDates: [],
			allowances: null,
			chance: null,
		},
		cliVersion: "0.0.0",
		reads: { fi: { [PLAN]: { argv: ["fi", PLAN], ok: true, data: fi } }, chance, documents },
	} as unknown as Snapshot
}

const SUCCESS_NOTE =
	"The plan holds to 2043-12-31 on 174 of 200 seeded Market paths: a success share of 87.00%."
const HERO_CHANCE = chanceFixture({ succeeded: 174, paths: 200, notes: [SUCCESS_NOTE] })

describe("heroOf", () => {
	test("answers a reachable plan with its month, each person's age and what the chance measured", () => {
		const hero = heroOf(
			snapshotOf(reachable([{ person: "me", age: 54 }]), {
				chance: HERO_CHANCE,
				household: HOUSEHOLD,
			}),
		)
		expect(hero?.sentence).toBe(`You could stop working in Mar 2041, at You 54. ${SUCCESS_NOTE}`)
	})

	test("names the partner in a household of more than one person", () => {
		const hero = heroOf(
			snapshotOf(
				reachable([
					{ person: "me", age: 50 },
					{ person: "partner", age: 48 },
				]),
				{ household: PAIR },
			),
		)
		expect(hero?.sentence).toBe("You could stop working in Mar 2041, at You 50, Your partner 48.")
	})

	test("answers an unreachable plan with its horizon, the binding sentence and the best case", () => {
		const hero = heroOf(snapshotOf(fiFixture(UNREACHABLE.insufficientMoney)))
		expect(hero?.sentence).toBe(
			"You could not stop working before 31 Dec 2060. The money runs out, and even the locked or unrouted assets are not enough to cover the gap. If earned income stopped in Mar 2030, the money runs out on 1 Aug 2031.",
		)
	})

	test("leaves the age clause out when the plan states no age", () => {
		const hero = heroOf(snapshotOf(reachable(), { chance: HERO_CHANCE }))
		expect(hero?.sentence).toBe(`You could stop working in Mar 2041. ${SUCCESS_NOTE}`)
		expect(hero?.sentence).not.toContain(", at ")
	})

	test("answers a reachable plan with no chance read in its FI date alone", () => {
		const hero = heroOf(
			snapshotOf(reachable([{ person: "me", age: 54 }]), { household: HOUSEHOLD }),
		)
		expect(hero?.sentence).toBe("You could stop working in Mar 2041, at You 54.")
		expect(hero?.sentence).not.toContain("simulated markets")
	})

	test("names the chance's own horizon and counts when it states no success note", () => {
		const hero = heroOf(snapshotOf(reachable(), { chance: chanceFixture({ succeeded: 174 }) }))
		expect(hero?.sentence).toBe(
			"You could stop working in Mar 2041. Your plan as written holds to 2028-12-31 in 174 of 200 simulated markets, which is not a guarantee.",
		)
	})

	test("holds no arithmetic: every number is exactly one of the values it was given", () => {
		const age = 47
		const succeeded = 137
		const paths = 219
		const horizon = "2058-12-31"
		const hero = heroOf(
			snapshotOf(reachable([{ person: "me", age }], "2057-07-01"), {
				chance: chanceFixture({ succeeded, paths, horizon, notes: ["Every figure is nominal."] }),
				household: HOUSEHOLD,
			}),
		)
		expect(hero?.sentence).toBe(
			"You could stop working in Jul 2057, at You 47. Your plan as written holds to 2058-12-31 in 137 of 219 simulated markets, which is not a guarantee.",
		)
		expect(hero?.sentence.match(/\d+/g)).toEqual(["2057", "47", "2058", "12", "31", "137", "219"])
	})
})

describe("the warnings count", () => {
	const notes = [
		"29603.80 of Contributions could not be funded, so they were not made. Contribution cap: use a monthly Flow.",
		"The Scenario had 125000.00 unmet on 2027-03-31. Anything the day's income cannot cover is paid only from the Accounts in cashflow.withdraw.",
		"No tax is applied; figures are before tax.",
		'Tax is applied: Thailand 2026 personal income tax, from the Scenario\'s Levy "th-2026-pit".',
		"FI is not reachable, so taxYears describes the plan as written, with earned income running to the horizon.",
	]

	test("counts the unfunded, unmet and tax notes, and no others", () => {
		const hero = heroOf(snapshotOf({ ...reachable(), notes }))
		expect(hero?.warnings).toHaveLength(3)
		expect(hero?.warningsLabel).toBe("3 things to check")
		expect(notes.filter(isWarningNote)).toEqual(notes.slice(0, 3))
	})

	test("recognises the exact sentences the CLI's note builders state", () => {
		const stated = [
			"29603.80 of Contributions could not be funded, so they were not made. Contribution cap: use a monthly Flow.",
			"Side B could not fund 125000.00 of Contributions, so they were not made. Contribution cap: use a monthly Flow.",
			"The Scenario had 125000.00 unmet on 2027-03-31. Anything the day's income cannot cover is paid only from the Accounts in cashflow.withdraw, and this asset Account was not in it, holding on that day: bank (125000.00). If the Scenario may draw on it, add it to cashflow.withdraw, for example --set 'cashflow.withdraw=[\"bank\"]'.",
			"No tax is applied; figures are before tax.",
			"The 2026 tax year is charged on the Flows from 2026-10-31 plus the stated Carry-in, not the whole year.",
			"Tax before 2026 is not recomputed; any tax still owed belongs in the Ledger as a liability.",
		]
		expect(stated.filter(isWarningNote)).toEqual(stated)
	})

	test("leaves the success note and an applied-tax note out of the count", () => {
		expect(isWarningNote(SUCCESS_NOTE)).toBe(false)
		expect(
			isWarningNote(
				'Tax is applied: Thailand 2026 personal income tax, from the Scenario\'s Levy "th-2026".',
			),
		).toBe(false)
	})

	test("links each warning to the note it counts, by the note's own anchor", () => {
		const hero = heroOf(snapshotOf({ ...reachable(), notes }))
		expect(hero?.warnings.map((warning) => warning.anchor)).toEqual([
			noteAnchor(PLAN, 0),
			noteAnchor(PLAN, 1),
			noteAnchor(PLAN, 2),
		])
		expect(hero?.warnings.map((warning) => warning.text)).toEqual(notes.slice(0, 3))
	})

	test("says one thing, or nothing, in words", () => {
		expect(warningsLabel(0)).toBeNull()
		expect(warningsLabel(1)).toBe("1 thing to check")
		expect(warningsLabel(2)).toBe("2 things to check")
	})
})
