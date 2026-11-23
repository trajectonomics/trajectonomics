import { z } from "zod"
import { UUID_SHAPED } from "../account/name"
import { type Context, ok, type Result } from "../command"
import { missingFieldError } from "../document"
import { type AppError, isAppError } from "../errors"
import type { ScenarioRow } from "../store"
import { withStore } from "../with-store"
import { type ApplyFlags, WHAT_IF_NAME } from "./apply-forms"
import { removedLevyNotes } from "./apply-notes"
import { type ApplyResult, applyShape, replyOf } from "./apply-write"
import type { ScenarioDocument } from "./document"
import { invalidScenarioName, scenarioChanged, scenarioNotFound } from "./errors"
import { appliedOverride } from "./override-flags"
import { applyScenarioSets } from "./set-apply"
import type { AppliedOverride } from "./set-error"

/*
 * `scenario apply <name> --set/--without` (cli ADR-0057): a what-if applied to the stored plan it came
 * from. Its Overrides are the ones `projection run` applies, through the same function, so the plan
 * stored is the plan a projection would have run, and a refusal is the one a projection gives.
 */

/** What the what-if form prints: the apply's result, and the Overrides it wrote, in command-line order. */
export type WhatIfResult = ApplyResult & {
	overrides: AppliedOverride[]
	removals: string[]
}

/** The document form prints none of these, so its output is unchanged (cli ADR-0057). */
export const whatIfResult: z.ZodType<WhatIfResult> = z.strictObject({
	...applyShape,
	overrides: z.array(appliedOverride).describe("The applied overrides, in command-line order."),
	removals: z
		.array(z.string())
		.describe("The dotted paths of the list items taken out with --without, in order."),
})

/** The flags of a what-if: the Overrides to apply to the stored plan, and the write's options. */
export type WhatIfWrite = {
	name: string
	sets: readonly string[]
	without: readonly string[]
	decimal: boolean
	dryRun: boolean
	/** The content hash the caller read; the write is refused when the stored plan has another (cli ADR-0055). */
	ifHash?: string | undefined
}

/**
 * The stored plan a what-if applies to. A hash the caller named must be the stored plan's, and a plan
 * that is not stored refuses it with `scenario_changed`; no hash makes a missing plan a lookup miss
 * (ADR-0055, ADR-0021).
 */
function planToApplyTo(current: ScenarioRow | null, write: WhatIfWrite): ScenarioRow | AppError {
	if (write.ifHash === undefined) return current ?? scenarioNotFound(write.name, "name")
	return current?.contentHash === write.ifHash
		? current
		: scenarioChanged(write.name, write.ifHash, current?.contentHash ?? null)
}

/**
 * Applies a what-if to the stored plan and stores the result. The write names the hash of the plan it
 * read, so a plan that moves between the read and the write is refused, not overwritten (ADR-0055).
 * An unchanged result is the already-true write of ADR-0021: nothing is written and the command exits 0.
 */
export function writeWhatIf(ctx: Context, write: WhatIfWrite): Result<WhatIfResult> | AppError {
	return withStore(ctx, (store) => {
		const current = store.getScenario(write.name)
		if (isAppError(current)) return current
		const plan = planToApplyTo(current, write)
		if (isAppError(plan)) return plan
		const applied = applyScenarioSets(JSON.parse(plan.document) as ScenarioDocument, write.sets, {
			without: write.without,
			decimal: write.decimal,
		})
		if (isAppError(applied)) return applied
		const outcome = store.saveScenario(
			{ name: write.name, document: applied.document, expectedHash: plan.contentHash },
			{ dryRun: write.dryRun },
		)
		if (isAppError(outcome)) return outcome
		const reply = replyOf(outcome, {
			decimal: write.decimal,
			dryRun: write.dryRun,
			notes: removedLevyNotes(plan.document, applied.document, write.dryRun),
		})
		if (isAppError(reply)) return reply
		return ok({
			...reply.data,
			overrides: applied.overrides,
			removals: applied.removals,
		})
	})
}

/**
 * The what-if form of `scenario apply`, chosen when no `--file` is given and a Set or a removal is.
 * It names the stored plan it applies to, and reads no document.
 */
export function applyWhatIfFlags(ctx: Context, input: ApplyFlags): Result<WhatIfResult> | AppError {
	if (input.name === undefined) return missingFieldError(WHAT_IF_NAME)
	if (UUID_SHAPED.test(input.name)) return invalidScenarioName()
	return writeWhatIf(ctx, {
		name: input.name,
		sets: input.set ?? [],
		without: input.without ?? [],
		decimal: input.decimal === true,
		dryRun: input.dryRun === true,
		ifHash: input.ifHash,
	})
}
