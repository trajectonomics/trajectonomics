import type { AppError } from "../errors"
import type { SegmentContext } from "./set-error"
import { flagError, type OverrideFlag } from "./set-parse"

/**
 * The optional top-level blocks of a Scenario that a `--set` may begin when the document leaves them
 * out (cli ADR-0065): `--set estate=<json>` writes the whole block where there was none. Only a block
 * is on the list, never a list of items (`--add` begins those, ADR-0062) and never a key a plan must
 * state. The Dashboard needs `estate`, so that is the one block today; a block joins this list in the
 * pull request that needs it, and `set-begin.test.ts` fails when a name here is not an optional object
 * the published schema declares.
 */
export const BEGINNABLE_BLOCKS: readonly string[] = ["estate"]

export function isBeginnableBlock(segment: string): boolean {
	return BEGINNABLE_BLOCKS.includes(segment)
}

/** `--set estate.costs=…` on a document with no `estate`: the block is begun whole, never by a part. */
export function unbegunBlock(segment: string, ctx: SegmentContext): AppError {
	const flag: OverrideFlag = ctx.flag ?? "set"
	return flagError(
		flag,
		ctx.index,
		`the document has no "${segment}" block yet, so "${ctx.path}" has nothing to change`,
		{
			hint: `Begin the block whole with --set ${segment}=<json>, such as --set '${segment}={"costs":[...]}'; a later --set can then change a part of it.`,
			details: { index: ctx.index, path: ctx.path, segment, suggestion: null },
		},
	)
}
