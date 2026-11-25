import type { FlowDraft, FlowKind } from "./flows"

/** The problem shown at an expense's category that is not 1 to 64 characters, none a control character (cli schema). */
export const CATEGORY_PROBLEM = "Enter a category of 1 to 64 characters, or leave it empty."

/** Whether a category is 1 to 64 characters, none of them a control character. */
export function isCategoryText(category: string): boolean {
	if (category.length < 1 || category.length > 64) return false
	return [...category].every((char) => {
		const code = char.charCodeAt(0)
		return code >= 32 && code !== 127
	})
}

/** The category a draft names for an expense, trimmed; null for an empty one and for any other kind of Flow. */
export function categoryOf(draft: FlowDraft, kind: FlowKind): string | null {
	if (kind !== "expense") return null
	const category = draft.category.trim()
	return category === "" ? null : category
}
