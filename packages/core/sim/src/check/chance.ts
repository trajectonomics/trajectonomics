import type { Check, Emit, Problem } from "./codes"
import { makeGuard, type Root } from "./guard"
import { bool, boundedInt, seed } from "./scalars"
import { anyVersion, checkShape, isRecord, opt, req, type Shape } from "./shape"

const paths = boundedInt(1, 10000, "INVALID_PATH_COUNT")
const pathIndex: Check = boundedInt(0, 9999, "INVALID_PATH_INDEX")
const chanceShape: Shape = {
	model: opt(anyVersion),
	seed: req(seed),
	paths: req(paths),
	outcomes: opt(bool),
	milestoneDates: opt(bool),
}
const pathShape: Shape = {
	model: opt(anyVersion),
	seed: req(seed),
	paths: req(paths),
	index: req(pathIndex),
}

function checkOptions(value: unknown, root: Root, shape: Shape): readonly Problem[] {
	const problems: Problem[] = []
	const emit: Emit = (code, path) => void problems.push({ code, path })
	const guard = makeGuard(emit)
	guard(root, undefined, () => {
		if (!isRecord(value)) return emit("NOT_AN_OBJECT", [root])
		checkShape(value, [root], shape, emit)
	})
	return problems
}

/**
 * Validates the seed, path count and report flags of `chanceOfSuccess` options. The Return model is
 * checked by `checkReturnModel`, which needs the Scenario's accounts.
 */
export function checkChanceOptions(value: unknown): readonly Problem[] {
	return checkOptions(value, "options", chanceShape)
}

/**
 * Validates the seed, path count and path index of `projectPath`'s selection, reported under
 * `selection`; the model is `checkReturnModel`'s. An index at or past the path count is refused.
 */
export function checkPathSelection(value: unknown): readonly Problem[] {
	const found = checkOptions(value, "selection", pathShape)
	if (found.length > 0 || !isRecord(value)) return found
	const { index, paths } = value as { readonly index: number; readonly paths: number }
	return index < paths ? [] : [{ code: "INVALID_PATH_INDEX", path: ["selection", "index"] }]
}
