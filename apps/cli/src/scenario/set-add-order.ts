import { type AppError, fail, isAppError } from "../errors"
import { isPlainObject } from "../json"
import { type ParsedAdd, parseAdd } from "./set-add-parse"
import { flagError } from "./set-parse"

/*
 * `--without` and `--add` in one call (cli ADR-0062): every `--without` runs before every `--add`, and an
 * `--add` never brings back an item the same call took out.
 */

/**
 * Refuses an item whose path a `--without` of the same call took out. A replace would drop every field
 * the `--add` did not restate and could disagree with the household anchors a saved plan re-applies, so
 * the plan saved would not be the plan projected (cli ADR-0062).
 */
export function removedByCall(
	parsed: ParsedAdd,
	index: number,
	removed: readonly string[],
): AppError | null {
	if (!removed.includes(parsed.path)) return null
	return flagError("add", index, `"${parsed.path}" is taken out by --without in the same call`, {
		hint: `Every --without runs before every --add, and --add never replaces an item. To change "${parsed.path}", leave it in and use --set ${parsed.path}.<key>=<value> for each field.`,
		details: { index, path: parsed.path, list: parsed.list, id: parsed.id },
	})
}

/**
 * A `--without` refused as an unknown id, with the reason when an `--add` of the same call names that
 * path: every `--without` runs before every `--add`, so it cannot see the item the call adds.
 */
export function explainRemovalOrder(error: AppError, adds: readonly string[]): AppError {
	const { body } = error
	const details = isPlainObject(body.details) ? body.details : {}
	const path = details["path"]
	if (body.code !== "invalid_input" || body.path !== "without" || typeof path !== "string") {
		return error
	}
	const named = adds.some((raw, index) => {
		const parsed = parseAdd(raw, index)
		return !isAppError(parsed) && parsed.path === path
	})
	if (!named) return error
	return fail("invalid_input", {
		message: body.message,
		path: body.path,
		hint: `Every --without runs before every --add, so it cannot take out an item the same call adds ("${path}"); leave it out of the --add instead.`,
		details: body.details,
	})
}
