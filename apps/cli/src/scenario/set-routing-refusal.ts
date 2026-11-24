import type { AppError } from "../errors"
import type { SegmentContext } from "./set-error"
import { flagError } from "./set-parse"

/** A routing step or entry has no id, so `--without` cannot name it (cli ADR-0070). */
export function refusedRoutingItem(
	segment: string,
	prefix: readonly string[],
	ctx: SegmentContext,
): AppError {
	const list = prefix[prefix.length - 1] ?? "surplus"
	return flagError(
		"without",
		ctx.index,
		`"${segment}" cannot name a routing step or entry, which has no id`,
		{
			hint: `--without takes out an item by its id, and a routing step or entry has none: --set cashflow.${list}=<json> with the list you want.`,
			details: { index: ctx.index, path: ctx.path, segment },
		},
	)
}
