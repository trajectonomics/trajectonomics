import type { Edit } from "./edit"

/**
 * The Scenario names the Snapshot projects after an Edit. A copy or an apply adds its name to an
 * explicit list; a delete takes its name out. An empty list means every Scenario, so it stays empty.
 */
export function followPlan(scenarios: readonly string[], edit: Edit): string[] {
	switch (edit.kind) {
		case "delete-plan":
			return scenarios.filter((name) => name !== edit.name)
		case "set-household":
		case "remove-household":
			return [...scenarios]
		case "copy-plan":
		case "apply-plan":
			return scenarios.length === 0 || scenarios.includes(edit.name)
				? [...scenarios]
				: [...scenarios, edit.name]
	}
}
