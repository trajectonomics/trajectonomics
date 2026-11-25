import { describe, expect, test } from "bun:test"
import type { ProjectionChance, ProjectionPath, Read } from "../../contract"
import { chanceWithOutcomes, pathFixture } from "./futures.test-support"
import { indexOf, type LiveEntry, type PathInput, resolvePath, runKey } from "./path-state"

const chance = chanceWithOutcomes()
const good: Read<ProjectionChance> = { argv: ["chance"], ok: true, data: chance }
const stored = (index: number, patch: Partial<ProjectionPath> = {}): Read<ProjectionPath> => ({
	argv: ["path", String(index)],
	ok: true,
	data: pathFixture(index, patch),
})

function input(patch: Partial<PathInput>): PathInput {
	return {
		chance: good,
		index: "2",
		stored: undefined,
		live: () => undefined,
		canRead: false,
		...patch,
	}
}

describe("indexOf", () => {
	test("takes a whole number below the paths, and nothing else", () => {
		expect(indexOf("0", 6)).toBe(0)
		expect(indexOf("5", 6)).toBe(5)
		expect(indexOf("6", 6)).toBeNull()
		for (const bad of ["", "-1", "1.5", "1e2", "abc", " 2", "123456"])
			expect(indexOf(bad, 999999)).toBeNull()
	})
})

describe("resolvePath", () => {
	test("opens a path the Snapshot read in advance, with no live read", () => {
		const found = resolvePath(input({ stored: { "2": stored(2) } }))
		expect(found.wanted).toBeNull()
		expect(found.state).toMatchObject({ kind: "ready", argv: ["path", "2"] })
	})

	test("in the Demo (no live dashboard) a path the Snapshot lacks is unavailable, and asks for nothing", () => {
		expect(resolvePath(input({ canRead: false }))).toEqual({
			state: { kind: "unavailable" },
			wanted: null,
		})
	})

	test("with a live dashboard it asks for the path, naming the run, and shows loading", () => {
		const found = resolvePath(input({ canRead: true }))
		expect(found.state).toEqual({ kind: "loading" })
		expect(found.wanted).toEqual({ index: 2, run: runKey(chance) })
	})

	test("shows a path read live for this run, and asks for no second read while one is in flight", () => {
		const run = runKey(chance)
		const done: LiveEntry = { run, status: "done", read: stored(3) }
		expect(resolvePath(input({ index: "3", canRead: true, live: () => done })).state.kind).toBe(
			"ready",
		)
		const loading: LiveEntry = { run, status: "loading" }
		const waiting = resolvePath(input({ canRead: true, live: () => loading }))
		expect(waiting).toEqual({ state: { kind: "loading" }, wanted: null })
	})

	test("never shows a path of another run: one read for another seed is read again", () => {
		const other: LiveEntry = { run: "another run", status: "done", read: stored(2) }
		expect(resolvePath(input({ canRead: true, live: () => other })).wanted).not.toBeNull()
	})

	test("refuses a path whose definition or plan content is not the chance's, stored or live", () => {
		const seeded = stored(2, { definition: { ...chance.definition, seed: "ffffffffffffffff" } })
		const refused = resolvePath(input({ stored: { "2": seeded } }))
		expect(refused.state).toMatchObject({ kind: "failed" })
		const edited = pathFixture(2, {
			scenario: { ...chance.scenario, effectiveContentHash: "jcs1:sha256:zzz" },
		})
		const live: LiveEntry = {
			run: runKey(chance),
			status: "done",
			read: { argv: [], ok: true, data: edited },
		}
		expect(resolvePath(input({ canRead: true, live: () => live })).state.kind).toBe("failed")
	})

	test("shows the CLI's own error of a failed path read, and a failed live read", () => {
		const error = { code: "invalid_input", exitCode: 2, message: "No such path." }
		const failed = resolvePath(input({ stored: { "2": { argv: [], ok: false, error } } }))
		expect(failed.state).toEqual({ kind: "failed", message: "No such path." })
		const live: LiveEntry = {
			run: runKey(chance),
			status: "failed",
			message: "Could not reach traj.",
		}
		expect(resolvePath(input({ canRead: true, live: () => live })).state).toEqual({
			kind: "failed",
			message: "Could not reach traj.",
		})
	})

	test("an index outside the run's paths, or a chance that failed or is missing, is said and never read", () => {
		expect(resolvePath(input({ index: "6", canRead: true })).state).toMatchObject({
			kind: "bad-index",
		})
		expect(resolvePath(input({ index: "x", canRead: true })).wanted).toBeNull()
		const error = { code: "projection_refused", exitCode: 3, message: "The engine refused." }
		const failed = resolvePath(input({ chance: { argv: [], ok: false, error }, canRead: true }))
		expect(failed).toEqual({
			state: { kind: "no-chance", message: "The engine refused." },
			wanted: null,
		})
		expect(resolvePath(input({ chance: undefined, canRead: true })).state.kind).toBe("no-chance")
	})
})
