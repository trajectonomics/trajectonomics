import type { EstateBlock, ScenarioDocument } from "../../contract"

/** The document with the estate block put in, or without one when the block is null: no line left means the plan states none. */
export function withEstate(doc: ScenarioDocument, block: EstateBlock | null): ScenarioDocument {
	const { estate: _estate, ...rest } = doc
	return block === null ? rest : { ...rest, estate: block }
}
