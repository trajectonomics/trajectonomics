/** What every section of the page is made against: the plan as stored and as the session shows it, the names, and the run its figures read. */
import type { HouseholdDocument, ProjectionRun, ScenarioDocument } from "../../contract"
import { anchorChoices } from "../estate/anchors"
import { milestoneIds } from "../withdrawals/context"
import type { TransferContext } from "./transfer-draft"

/** The plan a change is made against: its name, the hash the page read and its document as stored. */
export interface RoutingPlan {
	readonly name: string
	readonly contentHash: string
	readonly doc: ScenarioDocument
}

export interface RoutingContext extends RoutingPlan {
	/** The plan as the What-if session shows it, which a drawer that tries a value starts from. */
	readonly shown: ScenarioDocument
	readonly names: ReadonlyMap<string, string>
	readonly household: HouseholdDocument | null
	readonly asOf: string
	/** Whether the controls show: the server answers, and the page is not the Demo snapshot. */
	readonly editable: boolean
	/** The run the figures read: the What-if's when it holds a try, else the saved plan's. */
	readonly run: ProjectionRun | undefined
	readonly tried: boolean
}

/** The Milestones, the household's dates and the As-of a transfer's drawer is made against. */
export function transferContext(ctx: RoutingContext): TransferContext {
	return {
		milestones: milestoneIds(ctx.doc),
		anchors: anchorChoices(ctx.doc, ctx.household, "9999-12-31"),
		asOf: ctx.asOf,
	}
}
