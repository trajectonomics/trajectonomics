import { describe, expect, test } from "bun:test"
import { snapshot } from "./snapshot"

/** A failed Read: the leaf's argv and the CLI's error envelope, which every Read slot accepts. */
function failed(argv: string[]) {
	return { argv, ok: false as const, error: { code: "not_found", exitCode: 4, message: "none" } }
}

/** Every Read a Snapshot must hold, as failures: the shape matters here, not the figures. */
const READS = {
	doctor: failed(["doctor"]),
	accounts: failed(["account", "list"]),
	balance: failed(["balance"]),
	netWorth: failed(["report", "networth"]),
	netWorthHistory: [],
	pnl: failed(["report", "pnl"]),
	transactions: failed(["tx", "list"]),
	baseline: failed(["baseline", "show"]),
	scenarios: failed(["scenario", "list"]),
	projections: { base: failed(["projection", "run"]) },
	fi: {},
	compare: null,
}

/** A Snapshot of the version, with the parameters and Reads given. */
const document = { snapshotVersion: 1, cliVersion: "0.0.0" }

const PARAMS = {
	asOf: "2026-10-31",
	horizon: "2053-12-31",
	scenarios: ["base"],
	compare: null,
	birthDate: null,
	ages: [],
	historyDates: ["2026-10-31"],
}

describe("the Snapshot's monthly reads (web ADR 0033)", () => {
	test("a Snapshot made before the monthly read decodes, and reads as no monthly row", () => {
		const parsed = snapshot.parse({ ...document, params: PARAMS, reads: READS })
		expect(parsed.reads.monthly).toEqual({})
	})

	test("a monthly read decodes under the projection run contract, and its refusal too", () => {
		const monthly = {
			base: failed(["projection", "run", "--scenario=base", "--monthly", "--json"]),
		}
		const parsed = snapshot.parse({ ...document, params: PARAMS, reads: { ...READS, monthly } })
		expect(parsed.reads.monthly["base"]?.argv).toContain("--monthly")
	})
})
