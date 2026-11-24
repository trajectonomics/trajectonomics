import type { Edit } from "./edit"

/** The list with one name put in place of another; a list without the name is as it was. */
function renamed(scenarios: readonly string[], from: string, to: string): string[] {
	return scenarios.map((name) => (name === from ? to : name))
}

/**
 * The Scenario names the Snapshot projects after an Edit. A copy or an apply adds its name to an
 * explicit list; a delete takes its name out; a rename puts the new name where the old one was. An empty
 * list means every Scenario, so it stays empty.
 */
export function followPlan(scenarios: readonly string[], edit: Edit): string[] {
	switch (edit.kind) {
		case "delete-plan":
			return scenarios.filter((name) => name !== edit.name)
		case "rename-plan":
			return renamed(scenarios, edit.name, edit.newName)
		case "set-household":
		case "remove-household":
		case "merge-tax":
		case "set-tax":
		case "remove-tax":
		case "set-plan-notes":
		case "set-main-plan":
			return [...scenarios]
		case "copy-plan":
		case "apply-plan":
		case "apply-overrides":
			return scenarios.length === 0 || scenarios.includes(edit.name)
				? [...scenarios]
				: [...scenarios, edit.name]
	}
}

/** The two plans a comparison names after an Edit: a rename carries the name into the comparison. */
export function followCompare(
	compare: { a: string; b: string } | null,
	edit: Edit,
): { a: string; b: string } | null {
	if (compare === null || edit.kind !== "rename-plan") return compare
	const swap = (name: string) => (name === edit.name ? edit.newName : name)
	return { a: swap(compare.a), b: swap(compare.b) }
}
