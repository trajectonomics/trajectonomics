/**
 * The pages whose answer changes with the viewing date (web ADR 0033). It starts empty, and each slice adds its page
 * when it wires the date, so Print and the picker never claim a page that ignores it.
 */
export const VIEWING_PAGES: readonly string[] = []

/** Whether a page uses the viewing date, by its route path and trailing slash exactly. */
export function usesViewingDate(path: string): boolean {
	return VIEWING_PAGES.includes(path)
}
