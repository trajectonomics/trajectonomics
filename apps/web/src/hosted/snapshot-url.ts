import { HOSTED_BASE as base } from "./overrides"

/** Where the Demo snapshot is served in the hosted build: the generated file, under the base path. */
export const DEMO_SNAPSHOT_PATH = `${base}/demo/snapshot.json`

/** The hosted build has no Snapshot of a person's own: the path its Edits would replace is the Demo's too. */
export const SNAPSHOT_PATH = DEMO_SNAPSHOT_PATH

/** Every page of the hosted build is the Demo, with or without `?demo=1`. */
export function isDemo(_search: string): boolean {
	return true
}

/** The one Snapshot the hosted build reads. The query string does not change it. */
export function snapshotUrl(_search: string): string {
	return DEMO_SNAPSHOT_PATH
}
