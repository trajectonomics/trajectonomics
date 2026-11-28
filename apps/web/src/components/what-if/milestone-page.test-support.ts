import { DEMO } from "../../lib/view/what-if/fixtures.test-support"

/** The props the Milestones page renders with in the what-if tests: the Demo's plans, chances and As-of. */
export function milestonePageProps(scenario = "base") {
	return {
		names: DEMO.params.scenarios,
		projections: DEMO.reads.projections,
		chances: DEMO.reads.chance,
		scenario,
		asOf: DEMO.params.asOf,
		terms: "both",
		onTerms: () => {},
	}
}
