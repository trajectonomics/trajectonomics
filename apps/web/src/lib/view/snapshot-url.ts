/** Where the Demo snapshot is served, as the generated file in public/demo/. */
export const DEMO_SNAPSHOT_PATH = "/demo/snapshot.json"

/** Where the Snapshot of the person's own ledger is written, next to the built pages. */
export const SNAPSHOT_PATH = "/snapshot.json"

/** Whether a query string asks for the Demo snapshot: `?demo=1`. */
export function isDemo(search: string): boolean {
	return new URLSearchParams(search).get("demo") === "1"
}

/** The path of the Snapshot a page loads: the Demo snapshot in demo mode, otherwise the person's own. */
export function snapshotUrl(search: string): string {
	return isDemo(search) ? DEMO_SNAPSHOT_PATH : SNAPSHOT_PATH
}
