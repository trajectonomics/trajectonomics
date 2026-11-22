import { describe, expect, it } from "bun:test"
import { FIXTURE_AS_OF, fixtureHome } from "./ledger-fixture"
import { ledgerHome } from "./store/testing"
import { capture } from "./test-support"

// ADR-0029's addendum: the three readings of the Ledger at a date state whether its record has
// started by that date, under the same two names and the same rule.
const READS = [["balance"], ["report", "networth"], ["baseline", "show"]] as const

function read(home: string, command: readonly string[], asOf: string, ...args: string[]) {
	return capture([...command, "--as-of", asOf, ...args], { TRAJ_HOME: home })
}

type Started = { firstTransactionDate: string | null; noTransactionsBefore: boolean }

async function started(home: string, command: readonly string[], asOf: string): Promise<Started> {
	const res = await read(home, command, asOf, "--json")
	expect(res.code).toBe(0)
	return JSON.parse(res.out) as Started
}

describe("the record has started", () => {
	for (const command of READS) {
		const name = command.join(" ")

		it(`${name}: a Ledger with no Transaction has no record at any date`, async () => {
			expect(await started(ledgerHome(), command, FIXTURE_AS_OF)).toMatchObject({
				firstTransactionDate: null,
				noTransactionsBefore: true,
			})
		})

		it(`${name}: an As-of before the first Transaction says the record has not started`, async () => {
			expect(await started(fixtureHome(), command, "2025-12-31")).toMatchObject({
				firstTransactionDate: "2026-01-01",
				noTransactionsBefore: true,
			})
		})

		it(`${name}: an As-of on or after the first Transaction says it has`, async () => {
			expect(await started(fixtureHome(), command, "2026-01-01")).toMatchObject({
				firstTransactionDate: "2026-01-01",
				noTransactionsBefore: false,
			})
			expect(await started(fixtureHome(), command, FIXTURE_AS_OF)).toMatchObject({
				firstTransactionDate: "2026-01-01",
				noTransactionsBefore: false,
			})
		})

		it(`${name}: prints a note before the record starts and none after`, async () => {
			const before = await read(fixtureHome(), command, "2025-12-31")
			expect(before.code).toBe(0)
			expect(before.out).toContain("firstTransactionDate: 2026-01-01")
			expect(before.out).toContain("noTransactionsBefore: true")
			expect(before.out.split("\n").at(-1)).toBe(
				"note: The first Transaction is dated 2026-01-01, after the As-of 2025-12-31, so this reading states that the record has not started, not that nothing is held.",
			)
			const after = await read(fixtureHome(), command, FIXTURE_AS_OF)
			expect(after.out).toContain("noTransactionsBefore: false")
			expect(after.out).not.toContain("note:")
			const json = await read(fixtureHome(), command, "2025-12-31", "--json")
			expect(json.out).not.toContain("note")
		})

		it(`${name}: publishes both fields in the schema`, async () => {
			const res = await capture(["schema", ...command, "--json"], { TRAJ_HOME: ledgerHome() })
			const output = JSON.parse(res.out).output as {
				required: string[]
				properties: Record<string, { type: unknown }>
			}
			expect(output.properties["firstTransactionDate"]?.type).toEqual(["string", "null"])
			expect(output.properties["noTransactionsBefore"]?.type).toBe("boolean")
			expect(output.required).toEqual(
				expect.arrayContaining(["firstTransactionDate", "noTransactionsBefore"]),
			)
		})
	}

	it("notes an Account-only Ledger, whose zero row would otherwise read as nothing held", async () => {
		const home = ledgerHome()
		const added = await capture(
			["account", "add", "Cash", "--type", "asset", "--currency", "THB", "--json"],
			{ TRAJ_HOME: home },
		)
		expect(added.code).toBe(0)
		for (const command of [["balance"], ["report", "networth"]] as const) {
			const res = await read(home, command, FIXTURE_AS_OF)
			expect(res.out).toContain("firstTransactionDate: null")
			expect(res.out).toContain("noTransactionsBefore: true")
			expect(res.out.split("\n").at(-1)).toBe(
				"note: The Ledger records no Transaction, so this reading states that the record has not started, not that nothing is held.",
			)
		}
	})
})
