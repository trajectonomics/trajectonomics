import { isDemo } from "../view/snapshot-url"

/**
 * Whether the Dashboard shows its Edit controls: the server answered a session token, and the page is
 * not the Demo snapshot. `vite preview` answers no token, so its controls stay hidden too
 * ([ADR 0008](../../../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
 */
export function editsShown(token: string | null, search: string): boolean {
	return token !== null && !isDemo(search)
}

/**
 * Whether a drawer a person opens from a compact card shows the item's form under its facts. On loopback the
 * drawer can save, so it does; the hosted Demo has no write path, so its drawer is a read of the facts
 * ([ADR 0028](../../../docs/adr/0028-the-hosted-demo-is-a-second-build-target-with-no-edit-client.md)).
 */
export function drawerEditsShown(): boolean {
	return true
}

/** Whether the Plan page offers Keep on a value `traj` wrote ([ADR 0032](../../../docs/adr/0032-home-and-the-plan-page-show-what-a-plan-assumes.md)). */
export function keepShown(): boolean {
	return true
}
