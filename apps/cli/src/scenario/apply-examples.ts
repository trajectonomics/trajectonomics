import type { Example } from "../command"

/** The examples `scenario apply` prints and runs (ADR-0043). */
export const APPLY_EXAMPLES: Example[] = [
	{
		command: "traj scenario apply --template",
		description: "Print a minimal document to start from.",
	},
	{
		command: "traj scenario apply --template --as-of 2026-03-31",
		description: "Print a Scenario pre-filled from the Baseline at one date, to edit and apply.",
	},
	{
		command: "traj scenario apply base --file base.json",
		description: "Create a Scenario, or update it when the document changed.",
	},
	{
		command: "traj scenario apply base --file -",
		description: "Read the document from stdin, for example redirected from base.json.",
	},
	{
		command: "traj scenario apply base --file base.json --dry-run",
		description: "Show the row and roll the write back.",
	},
	{
		command: "traj scenario apply base --file base-decimal.json --decimal",
		description: "Apply a document in decimal form, such as scenario show --decimal prints.",
	},
	{
		command:
			"traj scenario apply base --file base.json --if-hash jcs1:sha256:9d647e9e878ac76a185f4f1455cceb2bc3a420a547d81e96a89a5f3882a7a7d5",
		description:
			"Write only if base still holds that contentHash; otherwise refuse and write nothing.",
	},
	{
		command: "traj scenario apply base --set flows.salary.amount=9000000 --dry-run",
		description:
			"Apply a what-if to the stored base, as projection run --set would project it, and roll the write back.",
	},
	{
		command: `traj scenario apply base --add 'flows={"id":"extra","kind":"expense","amount":"1000.00","frequency":"monthly","start":"2026-04-01","growth":{"bps":0}}' --decimal --dry-run`,
		description:
			"Add one new Flow to the stored base, as projection run --add would project it, and roll the write back.",
	},
	{
		command: `traj scenario apply base --set 'estate={"costs":[{"id":"settlement","of":"gross","bps":"1.00","rounding":"halfUp"}]}' --decimal --dry-run`,
		description:
			"Begin the estate block on a stored plan that has none, as projection run --set would project it, and roll the write back.",
	},
]
