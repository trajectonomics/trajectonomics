import { useSyncExternalStore } from "react"
import { currentPathname, currentSearch, subscribeExternal } from "./browser"

/** The query string of the address bar. "" on the server and before the page hydrates. */
export function useSearch(): string {
	return useSyncExternalStore(subscribeExternal, currentSearch, () => "")
}

/** The path of the address bar. "/" on the server and before the page hydrates. */
export function usePathname(): string {
	return useSyncExternalStore(subscribeExternal, currentPathname, () => "/")
}
