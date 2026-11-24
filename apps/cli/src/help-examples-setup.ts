import { isAppError } from "./errors"
import { CHANCE_SETUP } from "./help-examples-chance"
import { BASE_HOUSEHOLD } from "./help-examples-household"
import { RUN_SETUP } from "./help-examples-run"
import { ACCOUNT_SETUPS } from "./help-examples-value"
import { VOLATILE_PLAN } from "./projection/plan-model-testing"
import { PROJECTION_SCENARIO } from "./projection/testing"
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

/** The default: a ledger with the fixture's accounts, transactions and the projection Scenarios. */
export const DEFAULT_SETUP: Setup = { ledger: "projection" }

/** Setup by leaf path, as the usage prints it (`tx add`). A leaf not listed uses DEFAULT_SETUP. */
export const SETUP: Record<string, Setup> = {
	...ACCOUNT_SETUPS,
	init: { ledger: "none" },
	// The Thai Levy on the base plan's salary, so there is a tax year to fill (cli ADR-0061).
	"projection allowances": {
		steps: [
			["scenario", "tax", "base", "--tax", "th-2026", "--label", "salary=income.section40_1"],
		],
	},
	// The plan with a spending rule, the volatile plan and a model file (cli ADR-0063, ADR-0068); `projection path` replays a path of the same chance (cli ADR-0069).
	"projection chance": CHANCE_SETUP,
	"projection path": CHANCE_SETUP,
	// The base plan with a volatility on its investment Account, which `--return-model plan` builds a model from (cli ADR-0068).
	"projection model": {
		files: { "volatile.json": JSON.stringify(VOLATILE_PLAN) },
		steps: [["scenario", "apply", "volatile", "--file", "volatile.json"]],
	},
	dashboard: {
		files: { "volatile.json": JSON.stringify(VOLATILE_PLAN) },
		steps: [["scenario", "apply", "volatile", "--file", "volatile.json"]],
	},
	"projection compare": { steps: [["scenario", "fork", "base", "early"]] },
	// The car loan, the spending rule and the estate the `--liabilities`, `--spending` and `--estate` examples read, stored beside the projection fixture.
	"projection run": RUN_SETUP,
	"scenario diff": { steps: [["scenario", "fork", "base", "early"]] },
	// The main plan is refused by `rm` until it is forced (cli ADR-0071).
	"scenario rm": {
		steps: [
			["scenario", "fork", "base", "early"],
			["scenario", "main", "base"],
		],
	},
	"scenario rename": { steps: [["scenario", "fork", "base", "early"]] },
	"data remove": { steps: [["backup", "--out", "backup"]] },
	// A restore needs an empty data directory, so the leaf backs up, then removes the data first.
	restore: {
		steps: [
			["backup", "--out", "backup"],
			["data", "remove", "--confirm", "~/.traj", "--backup", "backup"],
		],
	},
	"scenario notes": {
		steps: [["scenario", "fork", "base", "early"]],
		files: { "notes.txt": "Retire at 55.\nSell the condo in 2031.\n" },
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
	"traj scenario rm base": 5,
}
