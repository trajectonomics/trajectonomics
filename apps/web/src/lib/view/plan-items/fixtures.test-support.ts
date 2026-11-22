import {
	type Baseline,
	type Read,
	type ScenarioDocument,
	type ScenarioShow,
	scenarioDocument,
} from "../../contract"

/**
 * A Scenario document in the decimal form, parsed by the contract so the fixture is one the contract
 * accepts: an earned income, an expense that grows at a fixed rate, a computed Flow, and two Accounts.
 */
export function planDocument(): ScenarioDocument {
	return scenarioDocument.parse({
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 300 },
		accounts: [
			{ id: "bank", kind: "asset", rate: 100, lockedUntil: "2030-01-01" },
			{ id: "loan", kind: "liability", rate: 500, compounding: "monthly" },
		],
		flows: [
			{
				id: "salary",
				kind: "income",
				frequency: "monthly",
				start: "2026-11-01",
				end: "2050-05-14",
				amount: "90000.00",
				growth: "inflation",
				earned: true,
				label: "income.section40_1",
			},
			{
				id: "pension",
				kind: "income",
				frequency: "annual",
				start: "2026-11-01",
				amount: "12000.00",
				growth: { bps: 0 },
				earned: false,
			},
			{
				id: "rent",
				kind: "expense",
				frequency: "monthly",
				start: "2026-11-01",
				amount: "14000.00",
				growth: { bps: 300 },
			},
			{
				id: "tax-refund",
				kind: "income",
				frequency: "once",
				start: "2027-04-01",
				end: "2027-04-01",
				earned: false,
				derive: { measures: [], result: "none" },
			},
		],
		cashflow: { surplus: [{ account: "bank" }], contribute: ["bank"], withdraw: ["bank"] },
		levies: [{ id: "th-2026-pit", note: "kept as it is" }],
	})
}

/** The Read of the fixture's Scenario document, as `scenario show --decimal --json` answers it. */
export function documentRead(document: ScenarioDocument = planDocument()): Read<ScenarioShow> {
	return {
		argv: ["scenario", "show", "--decimal", "--json", "--", "base"],
		ok: true,
		data: {
			scenario: {
				id: "01a2",
				name: "base",
				contentHash: "jcs1:sha256:abc",
				forkedFrom: null,
				version: 2,
				createdAt: "2026-11-22T17:25:38.908Z",
				updatedAt: "2026-11-22T17:25:39.095Z",
				document,
			},
		},
	}
}

/** The Baseline the fixture's Accounts are read against: the bank holds money, the loan has no row. */
export function baselineRead(): Read<Baseline> {
	return {
		argv: ["baseline", "show", "--as-of", "2026-10-31", "--json"],
		ok: true,
		data: {
			asOf: "2026-10-31",
			currency: "THB",
			rows: [{ account: { id: "bank", name: "Bank" }, kind: "asset", amount: "662300.00" }],
		},
	}
}
