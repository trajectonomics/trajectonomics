import type { ProjectionRun } from "../../contract"
import { projectionRunFixture } from "../projection/fixtures.test-support"

type MilestoneRows = Extract<ProjectionRun["tables"][number], { name: "milestones" }>["rows"]

/** The fixture projection with a milestones table: the rows as the CLI states them, in Scenario order. */
export function withMilestones(
	rows: MilestoneRows,
	patch: Partial<ProjectionRun> = {},
): ProjectionRun {
	const run = projectionRunFixture(patch)
	return { ...run, tables: [...run.tables, { name: "milestones", count: rows.length, rows }] }
}

/** Three Milestones: one reached late in the first year, one reached in the second, one never reached. */
export const MILESTONE_ROWS: MilestoneRows = [
	{ id: "second-year", reached: true, date: "2027-10-31" },
	{ id: "first-year", reached: true, date: "2026-12-31" },
	{ id: "never", reached: false, date: null },
]
