/**
 * The `traj` calls a guided plan makes, as argv and the stdin each reads ([web ADR 0031](../../../docs/adr/0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)):
 * the decimal template, the apply of the document it builds, the household and, when that is refused, the removal.
 * Pure. `edit-guided.test.ts` pins every argv.
 */
import type { WriteCommand } from "./command"
import type { GuidedEdit } from "./guided-edit"

/** The read of the template the answers apply to: from history, or the two zero Streams of the plain template. */
export function guidedTemplateRead(edit: GuidedEdit): string[] {
	const history = edit.money.from === "history" ? ["--from-history"] : []
	return [
		"scenario",
		"apply",
		"--template",
		"--as-of",
		edit.asOf,
		...history,
		"--decimal",
		"--json",
	]
}

/** The write that starts the plan: the document the server built, in its decimal form, on stdin. */
export function guidedApplyCommand(name: string, document: unknown, dryRun: boolean): WriteCommand {
	return {
		argv: ["scenario", "apply", name, "--file", "-", "--decimal", ...dryRunFlags(dryRun), "--json"],
		stdin: JSON.stringify(document),
	}
}

/**
 * The write of the household the plan was saved with. It names no `--if-hash`: this Edit made the plan a
 * moment earlier, so there is no hash the page read.
 */
export function guidedHouseholdCommand(
	name: string,
	household: unknown,
	dryRun: boolean,
): WriteCommand {
	return {
		argv: ["scenario", "household", name, "--file", "-", ...dryRunFlags(dryRun), "--json"],
		stdin: JSON.stringify(household),
	}
}

/** The removal of a plan whose household was refused: it runs for real, so nothing of it is left behind. */
export function guidedRemoveCommand(name: string): string[] {
	return ["scenario", "rm", name, "--json"]
}

/** The flag a dry run carries, or none. */
function dryRunFlags(dryRun: boolean): string[] {
	return dryRun ? ["--dry-run"] : []
}
