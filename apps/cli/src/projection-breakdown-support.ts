import { projectionHome } from "./projection/testing"
import {
	BREAKDOWN_BARE,
	BREAKDOWN_SCENARIO,
	BREAKDOWN_SHORTFALL,
	BREAKDOWN_SURPLUS,
} from "./projection-breakdown-plan"
import { applyScenario } from "./scenario-test-support"

/** The fixture home with the breakdown plans stored beside the projection Scenarios. */
export async function breakdownHome(): Promise<string> {
	const home = await projectionHome()
	for (const [name, scenario] of [
		["breakdown", BREAKDOWN_SCENARIO],
		["breakdown-bare", BREAKDOWN_BARE],
		["breakdown-shortfall", BREAKDOWN_SHORTFALL],
		["breakdown-surplus", BREAKDOWN_SURPLUS],
	] as const) {
		const applied = await applyScenario(home, name, scenario)
		if (applied.code !== 0) throw new Error(applied.err)
	}
	return home
}
