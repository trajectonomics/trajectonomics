import type { Check, Emit, Problem } from "./codes"
import { makeGuard } from "./guard"
import { bool, boundedInt, seed } from "./scalars"
import { anyVersion, checkShape, isRecord, opt, req, type Shape } from "./shape"

const paths = boundedInt(1, 10000, "INVALID_PATH_COUNT")
const pathIndex: Check = boundedInt(0, 9999, "INVALID_PATH_INDEX")
const chanceShape: Shape = {
	model: opt(anyVersion),
	seed: req(seed),
	paths: req(paths),
	outcomes: opt(bool),
}
const pathShape: Shape = { model: opt(anyVersion), seed: req(seed), index: req(pathIndex) }

function checkOptions(value: unknown, shape: Shape): readonly Problem[] {
	const problems: Problem[] = []
	const emit: Emit = (code, path) => void problems.push({ code, path })
	const guard = makeGuard(emit)
	guard("options", undefined, () => {
		if (!isRecord(value)) return emit("NOT_AN_OBJECT", ["options"])
		checkShape(value, ["options"], shape, emit)
	})
	return problems
}

/**
 * Validates the seed, path count and `outcomes` flag of `chanceOfSuccess` options. The Return model is
 * checked by `checkReturnModel`, which needs the Scenario's accounts.
 */
export function checkChanceOptions(value: unknown): readonly Problem[] {
	return checkOptions(value, chanceShape)
}

/** Validates the seed and path index of `projectPath`'s selection; the model is `checkReturnModel`'s. */
export function checkPathSelection(value: unknown): readonly Problem[] {
	return checkOptions(value, pathShape)
}
