import type { ProjectionRun } from "../../contract"
import { estateFlow } from "./diagram"
import { figuresAt } from "./figures"

/** The keys of the diagram's bands on the last date of a run, by side. */
export function diagramBands(run: ProjectionRun): { sources: string[]; uses: string[] } {
	const figures = figuresAt(run, "2053-12-31")
	const flow = figures === null ? null : estateFlow(figures)
	if (flow === null) throw new Error("no diagram")
	return {
		sources: flow.sources.map((one) => one.key),
		uses: flow.uses.map((one) => one.key),
	}
}
