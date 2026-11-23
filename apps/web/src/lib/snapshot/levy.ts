import type { Read, ScenarioShow } from "../contract"

/** Whether a plan's read of its items holds a Levy: only such a plan can be asked what its allowances could take. */
export function hasLevy(shown: Read<ScenarioShow> | undefined): boolean {
	if (shown?.ok !== true) return false
	const { levies } = shown.data.scenario["document"]
	return (levies?.length ?? 0) > 0
}
