import { isAppError } from "./errors"
import { ILLUSTRATIVE_RETURN_MODEL } from "./projection/chance-testing"
import { PROJECTION_SCENARIO } from "./projection/testing"
import { LOAN_SCENARIO } from "./projection-liabilities-plan"
import { toDecimalForm } from "./scenario/decimal"

/**
 * What a leaf's examples need before they run, declared beside the test that runs them. Every
 * example of a leaf runs in order, in one data directory, so a later example sees what an earlier
 * one wrote; a leaf's `steps` run first. `~` in a step means the test's home, as in a shell.
 */
export type Setup = {
	/** The data directory's starting state: none, an empty ledger, the fixture, or the projection fixture. */
	ledger?: "none" | "empty" | "fixture" | "projection"
	/** Files the examples name, written into the working directory before they run. */
	files?: Record<string, string>
	/** Commands run first, as `traj` arguments; each must exit 0. */
	steps?: readonly (readonly string[])[]
}

/** The fixture in decimal form. A fixture that cannot convert fails here, not in a person's first run. */
function decimalText(document: object): string {
	const converted = toDecimalForm(document as Record<string, unknown>)
	if (isAppError(converted)) throw new Error(converted.body.message)
	return JSON.stringify(converted)
}

/**
 * The household the base fixture takes: the holder's age pins the salary's end, and their life's end
 * the investment's, so each anchor names a Flow the fixture holds (cli ADR-0048).
 */
const BASE_HOUSEHOLD = {
	schemaVersion: 1,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 90, joins: "2028-01" },
	],
	anchors: [
		{ path: "flows.salary.end", person: "me", age: 60 },
		{ path: "flows.invest.end", person: "me", at: "lifeEnd" },
	],
}

/** The default: a ledger with the fixture's accounts, transactions and the projection Scenarios. */
export const DEFAULT_SETUP: Setup = { ledger: "projection" }

/** Setup by leaf path, as the usage prints it (`tx add`). A leaf not listed uses DEFAULT_SETUP. */
export const SETUP: Record<string, Setup> = {
	"account add": {
		ledger: "empty",
		steps: [["account", "add", "Bank", "--type", "asset", "--currency", "THB"]],
	},
	init: { ledger: "none" },
	"projection chance": { files: { "model.json": JSON.stringify(ILLUSTRATIVE_RETURN_MODEL) } },
	"projection compare": { steps: [["scenario", "fork", "base", "early"]] },
	// The car loan the `--liabilities` example reads, stored as a Scenario beside the projection fixture.
	"projection run": {
		ledger: "projection",
		files: { "car-loan.json": JSON.stringify(LOAN_SCENARIO) },
		steps: [["scenario", "apply", "car-loan", "--file", "car-loan.json"]],
	},
	"scenario diff": { steps: [["scenario", "fork", "base", "early"]] },
	"scenario rm": { steps: [["scenario", "fork", "base", "early"]] },
	"data remove": { steps: [["backup", "--out", "backup"]] },
	// A restore needs an empty data directory, so the leaf backs up, then removes the data first.
	restore: {
		steps: [
			["backup", "--out", "backup"],
			["data", "remove", "--confirm", "~/.traj", "--backup", "backup"],
		],
	},
	"scenario household": { files: { "household.json": JSON.stringify(BASE_HOUSEHOLD) } },
	"scenario apply": {
		files: {
			"base.json": JSON.stringify(PROJECTION_SCENARIO),
			// The same document in decimal form, as `scenario show base --decimal` prints it.
			"base-decimal.json": decimalText(PROJECTION_SCENARIO),
		},
	},
	"tx import": {
		files: {
			"statement.csv":
				"date,from,to,amount,memo,external_ref,project\n2026-03-05,Cash,Food,45.00,Lunch,stmt-0001,\n",
		},
	},
}

/** Standard input for each example that reads stdin with `-`, by its exact command. */
export const STDIN: Record<string, string> = {
	"traj tx add --postings -": JSON.stringify({
		date: "2026-03-05",
		memo: "Lunch with two",
		postings: [
			{ account: "Food", amount: "200.00", currency: "THB" },
			{ account: "Misc", amount: "100.00", currency: "THB" },
			{ account: "Cash", amount: "-300.00", currency: "THB" },
		],
	}),
	"traj tx amend 0194b000-0004-7000-8000-000000000004 --postings -": JSON.stringify({
		date: "2026-02-25",
		memo: "Venture wages, corrected",
		postings: [
			{ account: "Cash", amount: "5000.00", currency: "THB" },
			{ account: "Salary", amount: "-5000.00", currency: "THB" },
		],
	}),
	"traj scenario apply base --file -": JSON.stringify(PROJECTION_SCENARIO),
	"traj tx import - --dry-run":
		"date,from,to,amount,memo,external_ref,project\n2026-03-06,Cash,Food,12.00,Coffee,stmt-0002,\n",
}

/**
 * The exit code an example documents where it is not 0. `data remove` with no flags is documented
 * as a refusal, which is the invalid-input exit (2).
 */
export const EXPECTED_EXIT: Record<string, number> = {
	"traj data remove": 2,
}
