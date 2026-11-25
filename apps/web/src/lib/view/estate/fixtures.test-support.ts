import type { HouseholdDocument, ProjectionRun, ScenarioDocument } from "../../contract"
import { DEMO } from "../what-if/fixtures.test-support"

/** The Demo's run, document and household of one plan. */
export function demoPlan(name: string): {
	run: ProjectionRun
	doc: ScenarioDocument
	household: HouseholdDocument | null
} {
	const run = DEMO.reads.projections[name]
	const doc = DEMO.reads.documents[name]
	if (!run?.ok || !doc?.ok) throw new Error(`the Demo lacks ${name}`)
	return { run: run.data, doc: doc.data.scenario.document, household: doc.data.scenario.household }
}

/** A household of people with the given life expectancies, born in 1990 so their ages match the Demo's rows. */
export function householdOf(
	people: readonly {
		id: string
		role: "holder" | "partner" | "dependent"
		lifeExpectancy: number
	}[],
): HouseholdDocument {
	return {
		schemaVersion: 1,
		anchors: [],
		people: people.map((one) =>
			one.role === "dependent"
				? { ...one, role: "dependent", relation: "child", born: "2027-09" }
				: { ...one, role: one.role, born: "1990-06" },
		),
	} as HouseholdDocument
}
