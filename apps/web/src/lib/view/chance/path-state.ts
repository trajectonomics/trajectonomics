import type { ProjectionChance, ProjectionPath, Read } from "../../contract"
import { isCliError } from "../../edit/failure"
import { pathKey, type RunOf, sameRun } from "../../snapshot/paths"

/** What the page holds of a path it read live: the run it was read for, and whether it is in flight, in, or failed. */
export type LiveEntry =
	| { readonly run: string; readonly status: "loading" }
	| { readonly run: string; readonly status: "done"; readonly read: Read<ProjectionPath> }
	| { readonly run: string; readonly status: "failed"; readonly message: string }

/** What the page shows for a path, and whether it must ask the server for it. */
export type PathState =
	| { readonly kind: "no-chance"; readonly message: string; readonly fromCli: boolean }
	| { readonly kind: "bad-index"; readonly message: string; readonly fromCli: false }
	| { readonly kind: "unavailable" }
	| { readonly kind: "loading" }
	| { readonly kind: "failed"; readonly message: string; readonly fromCli: boolean }
	| {
			readonly kind: "ready"
			readonly path: ProjectionPath
			/** The argv of the read the path came from. */
			readonly argv: readonly string[]
			readonly chance: ProjectionChance
	  }

/** The live read a page must start: the path's index, and the run of the chance it is for. */
export interface WantedRead {
	readonly index: number
	readonly run: string
}

/** The answer of `resolvePath`: the state to draw, and the live read the page must start now, if any. */
export interface PathResolution {
	readonly state: PathState
	readonly wanted: WantedRead | null
}

/** What a path is resolved from. */
export interface PathInput {
	/** The plan's chance read in the Snapshot. */
	readonly chance: Read<ProjectionChance> | undefined
	/** The index as the address bar has it, text. */
	readonly index: string
	/** The paths the Snapshot read in advance for this plan, by index as text, when it holds any. */
	readonly stored: Readonly<Record<string, Read<ProjectionPath>>> | undefined
	/** What this tab holds of the path read live, by index. */
	readonly live: (index: number) => LiveEntry | undefined
	/** Whether a live dashboard answers (the server gave a token, and the page is not the Demo snapshot). */
	readonly canRead: boolean
}

/** Identifies the run a chance read is of, so a path read for another run is not reused. */
export function runKey(run: RunOf): string {
	return JSON.stringify([run.definition, run.scenario.effectiveContentHash, run.asOf, run.horizon])
}

/** The index the address bar names, or null when it is not a whole number below the run's paths. */
export function indexOf(text: string, paths: number): number | null {
	if (!/^\d{1,5}$/.test(text)) return null
	const index = Number(text)
	return index < paths ? index : null
}

const ANOTHER_RUN =
	"This future is of a different run than the chance on screen. Reload the Dashboard."

/** A read held against the chance: its path when it is of that chance, else the sentence of why not. */
function checked(chance: ProjectionChance, read: Read<ProjectionPath>): PathState {
	if (!read.ok)
		return { kind: "failed", message: read.error.message, fromCli: isCliError(read.error) }
	if (!sameRun(chance, read.data)) return { kind: "failed", message: ANOTHER_RUN, fromCli: false }
	return { kind: "ready", path: read.data, argv: read.argv, chance }
}

/** The state of a path the chance cannot name: no good chance read, or an index outside its paths. Null when it can. */
function refusal(
	input: PathInput,
): { state: PathState; chance: ProjectionChance; index: number } | PathResolution {
	const { chance } = input
	if (chance === undefined || !chance.ok) {
		const failed = chance?.ok === false ? chance : null
		const message =
			failed === null
				? "This plan has no chance of success to open a future of."
				: failed.error.message
		return {
			state: { kind: "no-chance", message, fromCli: failed !== null && isCliError(failed.error) },
			wanted: null,
		}
	}
	const index = indexOf(input.index, chance.data.paths)
	if (index !== null) return { state: { kind: "loading" }, chance: chance.data, index }
	const last = chance.data.paths - 1
	const message = `The chance has ${chance.data.paths} futures, numbered 0 to ${last}.`
	return { state: { kind: "bad-index", message, fromCli: false }, wanted: null }
}

/**
 * The state of one future's page. The Snapshot's own read of it wins (the five representative paths), then one read
 * live earlier, and only then does the page ask a live dashboard for it. Every path is held against the chance on
 * screen (`sameRun`), so a replay always belongs to it. A path the Snapshot does not hold, on a page with no live
 * dashboard (the Demo), is "unavailable", which says that a live dashboard can open it.
 */
export function resolvePath(input: PathInput): PathResolution {
	const named = refusal(input)
	if (!("chance" in named)) return named
	const { chance, index } = named
	const stored = input.stored?.[pathKey(index)]
	if (stored !== undefined) return { state: checked(chance, stored), wanted: null }
	const run = runKey(chance)
	const live = input.live(index)
	if (live?.run === run) return { state: ofLive(chance, live), wanted: null }
	if (!input.canRead) return { state: { kind: "unavailable" }, wanted: null }
	return { state: { kind: "loading" }, wanted: { index, run } }
}

/** The state of a path read live for this run. */
function ofLive(chance: ProjectionChance, live: LiveEntry): PathState {
	if (live.status === "loading") return { kind: "loading" }
	if (live.status === "failed") return { kind: "failed", message: live.message, fromCli: false }
	return checked(chance, live.read)
}
