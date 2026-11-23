import type { EstateBlock } from "../contract"
import type { Json } from "./json"
import { type WhatIf, withSet } from "./session"

/** The path of the estate block in the Override grammar. `traj` replaces a path that exists, so only a plan that states a block can try one. */
export const ESTATE_PATH = "estate"

/**
 * The session with the estate block tried in it: one Set of the whole block (`--set estate=<json>`), which replaces any
 * earlier try. A block with no line is tried as an empty one. A Set of a field cannot add or remove a line, which is why
 * the block goes whole (cli ADR 0064, web ADR 0014).
 */
export function withTriedEstate(whatIf: WhatIf, block: EstateBlock | null): WhatIf {
	const value: Json = JSON.parse(JSON.stringify(block ?? {})) as Json
	return withSet(whatIf, ESTATE_PATH, value)
}
