import { PROJECTION_SCENARIO } from "./projection/testing"

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

/** The default: a ledger with the fixture's accounts, transactions and the projection Scenarios. */
export const DEFAULT_SETUP: Setup = { ledger: "projection" }

/** Setup by leaf path, as the usage prints it (`tx add`). A leaf not listed uses DEFAULT_SETUP. */
export const SETUP: Record<string, Setup> = {
	"account add": {
		ledger: "empty",
		steps: [["account", "add", "Bank", "--type", "asset", "--currency", "THB"]],
	},
	init: { ledger: "none" },
	"projection compare": { steps: [["scenario", "fork", "base", "early"]] },
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
	"scenario apply": { files: { "base.json": JSON.stringify(PROJECTION_SCENARIO) } },
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
