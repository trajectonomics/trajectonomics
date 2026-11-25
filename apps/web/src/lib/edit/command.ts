/**
 * The `traj` write each Edit runs: the argv, and the standard input the write reads. Pure; the Edit list is
 * `edit.ts`, and each Edit maps to one `traj` write here (a `scenario` write, or `account value` for the ledger) ([web ADR 0008](../../../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
 */
import { overrideTokens } from "../what-if/argv"
import type { Edit } from "./edit"
import { planCommand, startCommand } from "./plan-command"
import { valuesDocument } from "./record-values"
import { taxCommand } from "./tax-command"

/** The argv of one write, which ends with `--json`, and the standard input the write reads. */
export type WriteCommand = { argv: string[]; stdin?: string }

/**
 * The `traj` write an Edit runs. With `dryRun`, the argv carries `--dry-run`, so the write runs and is
 * rolled back ([cli ADR 0019](../../../../cli/docs/adr/0019-dry-run-executes-and-rolls-back.md)). The
 * writes that change a plan name the hash the page read with `--if-hash` (cli ADR 0055). A plan started
 * from the ledger's accounts also takes the template the server read (`templateRead`), which it applies.
 */
export function writeCommand(edit: Edit, dryRun: boolean, template?: string): WriteCommand {
	const flags = dryRun ? ["--dry-run", "--json"] : ["--json"]
	switch (edit.kind) {
		case "copy-plan": {
			// A copy with no Overrides is the plan as it is, so its argv keeps no override flag.
			const overrides =
				edit.sets.length + edit.removals.length + edit.additions.length === 0
					? []
					: [...overrideTokens(edit), "--decimal"]
			return { argv: ["scenario", "fork", edit.from, edit.name, ...overrides, ...flags] }
		}
		case "apply-overrides":
			// The what-if form of scenario apply: no --file, so the stored plan takes the Overrides (cli ADR 0057).
			return {
				argv: [
					"scenario",
					"apply",
					edit.name,
					...overrideTokens(edit),
					"--decimal",
					"--if-hash",
					edit.contentHash,
					...flags,
				],
			}
		case "apply-plan":
			if ("template" in edit) {
				if (template === undefined) throw new Error("a new plan needs the template it starts from")
				return startCommand(edit, template, flags)
			}
			// The page holds decimal-form documents only, so the write reads that form (ADR-0047).
			return {
				argv: [
					"scenario",
					"apply",
					edit.name,
					"--file",
					"-",
					"--decimal",
					"--if-hash",
					edit.contentHash,
					...flags,
				],
				stdin: JSON.stringify(edit.document),
			}
		case "delete-plan":
			return { argv: ["scenario", "rm", edit.name, ...flags] }
		case "set-household":
			// The household document is read from stdin, and its anchored dates are written (cli ADR-0048).
			return {
				argv: [
					"scenario",
					"household",
					edit.name,
					"--file",
					"-",
					"--if-hash",
					edit.contentHash,
					...flags,
				],
				stdin: JSON.stringify(edit.household),
			}
		case "remove-household":
			return {
				argv: [
					"scenario",
					"household",
					edit.name,
					"--none",
					"--if-hash",
					edit.contentHash,
					...flags,
				],
			}
		case "merge-tax":
		case "set-tax":
		case "remove-tax":
			return taxCommand(edit, flags)
		case "rename-plan":
		case "set-plan-notes":
		case "set-main-plan":
			return planCommand(edit, flags)
		case "record-values":
			// The batch is read from stdin: `against` and every value as typed, which traj parses (cli ADR 0072).
			return {
				argv: ["account", "value", "--file", "-", ...flags],
				stdin: JSON.stringify(valuesDocument(edit)),
			}
	}
}
