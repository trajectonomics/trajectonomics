import type { RenderHint } from "../table"
import { compareAnnualBlocks, compareTablesHidden } from "./compare-annual-human"
import { compareMilestoneBlocks, compareMilestonesHidden } from "./milestones"

/**
 * `projection compare`'s human view: the same figures as before, and each side's milestones as a
 * table of its own after them (cli ADR-0049). The milestones leave the listing, so they are not
 * printed twice.
 */
export const compareHint: RenderHint = {
	display: (data) => compareTablesHidden(compareMilestonesHidden(data)),
	blocks: (data) => [...compareAnnualBlocks(data), ...compareMilestoneBlocks(data)],
}
