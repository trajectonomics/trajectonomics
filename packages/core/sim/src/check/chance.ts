import type { Emit, Problem } from "./codes"
import { makeGuard } from "./guard"
import { boundedInt, seed } from "./scalars"
import { anyVersion, checkShape, isRecord, opt, req } from "./shape"

const paths = boundedInt(1, 10000, "INVALID_PATH_COUNT")

/**
 * Validates the seed and path count of `chanceOfSuccess` options. The Return model is checked
 * by `checkReturnModel`, which needs the Scenario's accounts.
 */
export function checkChanceOptions(value: unknown): readonly Problem[] {
	const problems: Problem[] = []
	const emit: Emit = (code, path) => void problems.push({ code, path })
	const guard = makeGuard(emit)
	guard("options", undefined, () => {
		if (!isRecord(value)) return emit("NOT_AN_OBJECT", ["options"])
		const shape = { model: opt(anyVersion), seed: req(seed), paths: req(paths) }
		checkShape(value, ["options"], shape, emit)
	})
	return problems
}
