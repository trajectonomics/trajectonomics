import { isDemo } from "../view/snapshot-url"

/**
 * Whether the Dashboard shows its Edit controls: the server answered a session token, and the page is
 * not the Demo snapshot. `vite preview` answers no token, so its controls stay hidden too
 * ([ADR 0008](../../../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
 */
export function editsShown(token: string | null, search: string): boolean {
	return token !== null && !isDemo(search)
}
