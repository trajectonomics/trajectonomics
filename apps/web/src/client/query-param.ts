import { useCallback } from "react"
import { replaceQueryParam } from "./browser"
import { useSearch } from "./location"

/**
 * One query parameter of the address bar as state, such as the Scenario a page shows. Setting it
 * rewrites the address in place, so the page's state is a link a person can copy.
 */
export function useQueryParam(name: string, fallback: string): [string, (value: string) => void] {
	const value = new URLSearchParams(useSearch()).get(name) ?? fallback
	const set = useCallback((next: string) => replaceQueryParam(name, next), [name])
	return [value, set]
}
