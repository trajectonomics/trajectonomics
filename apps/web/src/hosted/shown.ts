/**
 * The hosted build draws the Edit controls and the fence disables them ([ADR 0028](../../docs/adr/0028-the-hosted-demo-is-a-second-build-target-with-no-edit-client.md)),
 * so a visitor sees what the Dashboard can do. There is no server, so there is never a token to hold.
 */
export function editsShown(_token: string | null, _search: string): boolean {
	return true
}

/** A drawer opened from a compact card is a read of the facts here: the hosted Demo has no write path. */
export function drawerEditsShown(): boolean {
	return false
}
