import type { Fixture } from "../fixtures/fixture"
import { freelancer } from "../fixtures/freelancer"
import type { Flow } from "../types"

/** The freelancer Scenario with a category on its one expense: its Projection must equal the uncategorised one. */
export const categorisedFreelancer: Fixture = {
	...freelancer,
	scenario: {
		...freelancer.scenario,
		flows: freelancer.scenario.flows.map((flow): Flow => {
			if (flow.kind !== "expense") return flow
			return { ...flow, category: "essentials" }
		}),
	},
}
