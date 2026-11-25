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

/** A reachable FI answer with the ages the CLI states on its FI date. */
function reachable(ages: { person: string; age: number }[] = []): Fi {
	const base = fiFixture(REACHABLE)
	if (!base.fi.reachable) throw new Error("the fixture is reachable")
	return { ...base, fi: { ...base.fi, ages } }
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

const HERO_CHANCE = chanceFixture({ succeeded: 200, paths: 200 })

describe("heroOf", () => {
	test("answers a reachable plan with its month, the holder's age and the simulated markets", () => {
		const hero = heroOf(
			snapshotOf(reachable([{ person: "me", age: 54 }]), {
				chance: HERO_CHANCE,
				household: HOUSEHOLD,
			}),
		)
		expect(hero?.sentence).toBe(
			"You could stop working in Mar 2041, at 54. It held in 200 of 200 simulated markets, which is not a guarantee.",
		)
	})

	test("answers an unreachable plan with the horizon and the CLI's best case", () => {
		const hero = heroOf(snapshotOf(fiFixture(UNREACHABLE.insufficientMoney)))
		expect(hero?.sentence).toBe(
			"You could not stop working before 31 Dec 2060. If earned income stopped in Mar 2030, the money runs out on 1 Aug 2031.",
		)
	})

	test("leaves the age clause out when the plan has no household", () => {
		const hero = heroOf(snapshotOf(reachable(), { chance: HERO_CHANCE }))
		expect(hero?.sentence).toBe(
			"You could stop working in Mar 2041. It held in 200 of 200 simulated markets, which is not a guarantee.",
		)
		expect(hero?.sentence).not.toContain(", at ")
	})

	test("holds no arithmetic: every number in the sentence is already in the Snapshot", () => {
		for (const snapshot of [
			snapshotOf(reachable([{ person: "me", age: 54 }]), {
				chance: HERO_CHANCE,
				household: HOUSEHOLD,
			}),
			snapshotOf(fiFixture(UNREACHABLE.insufficientMoney)),
		]) {
			const hero = heroOf(snapshot)
			if (hero === null) throw new Error("expected a hero")
			const text = JSON.stringify(snapshot)
			const numbers = hero.sentence.match(/\d+/g) ?? []
			expect(numbers.length).toBeGreaterThan(0)
			for (const number of numbers) expect(text).toContain(number)
		}
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
