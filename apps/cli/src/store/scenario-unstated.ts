import type { ScenarioDocument } from "../scenario/document"
import { serializeUnstated } from "../scenario/unstated/entry"
import { unstatedKept } from "../scenario/unstated/kept"
import type { ScenarioRow } from "./rows"

/**
 * The `unstated` column a write stores (cli ADR-0084): a create writes the seed the caller gave, and
 * every other write keeps the stored entries whose value still resolves and is equal, minus the
 * paths its Sets state. A row from before the column has none.
 */
export function unstatedFor(
	current: ScenarioRow | null,
	next: ScenarioDocument,
	seed: string | null | undefined,
	stated: readonly string[],
): string | null {
	if (current === null) return seed ?? null
	const stored = JSON.parse(current.document) as ScenarioDocument
	return serializeUnstated(
		unstatedKept({ document: stored, unstated: current.unstated }, next, stated),
	)
}
