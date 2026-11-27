import { ILLUSTRATIVE_SEED } from "./projection/chance-testing"
import { AS_OF } from "./projection/testing"
import { HORIZON, milestonedHome } from "./projection-chance-milestones-fixture"
import { chanceBody } from "./projection-chance-support"
import { type Captured, capture } from "./test-support"

export { milestonedHome }

export const GOLDENS: URL = new URL("./projection/fixtures/", import.meta.url)

export function flags(model: string, scenarioName = "milestoned"): string[] {
	return [
		"chance",
		"--scenario",
		scenarioName,
		"--as-of",
		AS_OF,
		"--horizon",
		HORIZON,
		"--return-model",
		model,
		"--paths",
		"20",
		"--seed",
		ILLUSTRATIVE_SEED,
	]
}

export function milestoneFlags(model: string): string[] {
	return [...flags(model), "--milestone-dates"]
}

export function goldenText(res: Captured): string {
	const id = chanceBody(res).scenario.id
	return `${res.out.replace(`"${id}"`, '"the-scenario-id"')}\n`
}

/** Runs `traj projection`, or a schema leaf, with the telemetry and home a test must state. */
export function captureChance(home: string, argv: string[], json = true): Promise<Captured> {
	const command =
		argv[0] === "schema"
			? [...argv, "--json"]
			: ["projection", ...argv, ...(json ? ["--json"] : [])]
	return capture(command, { TRAJ_HOME: home, DO_NOT_TRACK: "1" })
}
