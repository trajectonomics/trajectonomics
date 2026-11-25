import { fileURLToPath } from "node:url"

/** The generated Demo snapshot ([ADR 0021](../docs/adr/0021-the-demo-snapshot-is-generated-at-build-and-not-committed.md)). */
export const DEMO_SNAPSHOT_FILE = fileURLToPath(
	new URL("../public/demo/snapshot.json", import.meta.url),
)

/** What a reader of the Demo snapshot says when the file has not been generated yet. */
export const DEMO_SNAPSHOT_MISSING = `The Demo snapshot is not generated yet (${DEMO_SNAPSHOT_FILE}). Run turbo run demo, or bun run demo in apps/web`

/** The Demo snapshot's text. A missing file throws the way to make it, not a bare ENOENT. */
export async function demoSnapshotText(): Promise<string> {
	const file = Bun.file(DEMO_SNAPSHOT_FILE)
	if (!(await file.exists())) throw new Error(DEMO_SNAPSHOT_MISSING)
	return file.text()
}

/** The Demo snapshot, parsed and unchecked: a caller runs the Snapshot schema over it. */
export async function demoSnapshotJson(): Promise<unknown> {
	return JSON.parse(await demoSnapshotText())
}
