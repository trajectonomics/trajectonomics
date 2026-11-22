import { type AppError, fail, isAppError } from "../errors"
import type { ScenarioDocument } from "../scenario/document"
import type { Ctx } from "./context"
import { write } from "./guard"
import { anchorsFor, canonicalDocument, insertScenario, liveScenario } from "./scenario-rows"
import type { ForkOptions, ScenarioForked } from "./types"

/**
 * Copies a live scenario under a new name; the original keeps existing (ADR-0016). The read, the
 * optional transform and the insert are one snapshot, so a concurrent apply cannot split them. The
 * copy keeps the household, its anchors resolved onto the transformed document (cli ADR-0048).
 */
export function forkScenario(
	ctx: Ctx,
	id: string,
	name: string,
	options: ForkOptions = {},
): ScenarioForked | AppError {
	if (name === "") return fail("invalid_input", { path: "name", message: "name is empty" })
	return write(
		ctx.db,
		() => {
			const source = liveScenario(ctx, "id", id)
			if (!source) return { status: "not_found" }
			const parsed = JSON.parse(source.document) as ScenarioDocument
			const changed = options.transform === undefined ? parsed : options.transform(parsed)
			if (isAppError(changed)) return changed
			const resolved = anchorsFor(source, changed, source.name)
			if (isAppError(resolved)) return resolved
			const document = canonicalDocument(resolved.document)
			const taken = liveScenario(ctx, "name", name)
			if (taken) return { status: "name_taken", scenario: taken, droppedAnchors: [] }
			return {
				status: "forked",
				scenario: insertScenario(ctx, {
					name,
					document,
					forkedFrom: id,
					household: resolved.household,
				}),
				droppedAnchors: resolved.dropped,
			}
		},
		options,
	)
}
