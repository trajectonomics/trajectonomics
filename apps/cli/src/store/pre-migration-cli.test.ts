import { describe, expect, it } from "bun:test"
import { existsSync, mkdirSync, statSync, symlinkSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { run } from "../cli"
import { type RunRecord, usageEvent } from "../telemetry/event"
import { capture } from "../test-support"
import { HEAD } from "./index"
import { copyPath } from "./pre-migration-files"
import { atVersion, dbOf } from "./pre-migration-test-support"
import { ledgerHome } from "./testing"

describe("the notice that follows an upgrade (cli ADR-0050)", () => {
	it("is one stderr line on the run that upgraded, and none after it", async () => {
		const home = await atVersion(2)
		const first = await capture(["scenario", "list", "--json"], { TRAJ_HOME: home })
		expect(first.code).toBe(0)
		expect(first.err.split("\n")).toHaveLength(1)
		expect(first.err).toContain(copyPath(dbOf(home), 2))
		expect(first.err).toContain(`from schema version 2 to ${HEAD}`)
		expect(JSON.parse(first.out)).toBeDefined()
		const second = await capture(["scenario", "list", "--json"], { TRAJ_HOME: home })
		expect(second.err).toBe("")
	})

	it("is not printed beside a failure's envelope", async () => {
		const home = await atVersion(2)
		const res = await capture(["scenario", "show", "nope", "--json"], { TRAJ_HOME: home })
		expect(res.code).not.toBe(0)
		expect(res.err.split("\n")).toHaveLength(1)
		expect(JSON.parse(res.err).error.code).toBe("not_found")
		expect(existsSync(copyPath(dbOf(home), 2))).toBe(true)
	})

	it("is not printed when the command fails after its store work: data remove without --confirm", async () => {
		const home = await atVersion(2)
		const res = await capture(["data", "remove", "--json"], { TRAJ_HOME: home })
		expect(res.code).toBe(2)
		expect(res.err.split("\n")).toHaveLength(1)
		const { error } = JSON.parse(res.err)
		expect(error.code).toBe("invalid_input")
		// The refusal says the plain-text copies stay beside the database.
		expect(error.hint).toContain(copyPath(dbOf(home), 2))
		expect(error.details.copies).toEqual([copyPath(dbOf(home), 2)])
	})

	it("is not printed when the command fails after its store work: backup into an existing directory", async () => {
		const home = await atVersion(2)
		const out = join(home, "taken")
		mkdirSync(out)
		const res = await capture(["backup", "--out", out, "--json"], { TRAJ_HOME: home })
		expect(res.code).toBe(5)
		expect(res.err.split("\n")).toHaveLength(1)
		expect(JSON.parse(res.err).error.code).toBe("output_exists")
	})

	it("is printed once after a backup that succeeded", async () => {
		const home = await atVersion(2)
		const out = join(home, "fresh")
		const res = await capture(["backup", "--out", out, "--json"], { TRAJ_HOME: home })
		expect(res.code).toBe(0)
		expect(res.err.split("\n")).toHaveLength(1)
		expect(res.err).toContain("Changes made after the upgrade are lost")
		expect(res.err).toContain("releases")
	})

	it("leaves the path out of the usage count of a run the copy refused", async () => {
		const home = await atVersion(2)
		mkdirSync(copyPath(dbOf(home), 2))
		writeFileSync(join(copyPath(dbOf(home), 2), "keep"), "")
		let record: RunRecord | undefined
		const code = await run(
			["scenario", "list", "--json"],
			{
				out: () => {},
				err: () => {},
				observe: (observed) => {
					record = observed
				},
			},
			{ TRAJ_HOME: home },
		)
		expect(code).toBe(1)
		if (record === undefined) throw new Error("expected a record")
		expect(record.errorCode).toBe("migration_failed")
		const event = JSON.stringify(
			usageEvent({
				id: "id",
				record,
				version: "1.0.0",
				platform: "linux",
				arch: "x64",
				timestamp: "2026-01-01T00:00:00.000Z",
				uuid: "uuid",
			}),
		)
		expect(event).not.toContain(home)
		expect(event).not.toContain(".bak")
	})
})

describe("doctor and the copies (cli ADR-0050)", () => {
	it("reports the copy its own open wrote", async () => {
		const home = await atVersion(2)
		const res = await capture(["doctor", "--json"], { TRAJ_HOME: home })
		expect(res.code).toBe(0)
		const data = JSON.parse(res.out)
		const copy = copyPath(dbOf(home), 2)
		expect(data.database.preMigrationCopies).toEqual([
			{ path: copy, schemaVersion: 2, bytes: statSync(copy).size },
		])
		const check = data.checks.find((c: { name: string }) => c.name === "database")
		expect(check.detail).toContain(copy)
		expect(data.ok).toBe(true)
	})

	it("lists the half-written copies a crash left, and skips a dangling link", async () => {
		const home = await atVersion(2)
		const stray = `${copyPath(dbOf(home), 2)}.0194e000.tmp`
		writeFileSync(stray, "x")
		symlinkSync(join(home, "missing"), copyPath(dbOf(home), 1))
		const res = await capture(["doctor", "--json"], { TRAJ_HOME: home })
		expect(res.code).toBe(0)
		const data = JSON.parse(res.out)
		expect(data.database.unfinishedCopies).toEqual([stray])
		expect(
			data.database.preMigrationCopies.map((c: { schemaVersion: number }) => c.schemaVersion),
		).toEqual([2])
		expect(data.checks.find((c: { name: string }) => c.name === "database").detail).toContain(stray)
	})

	it("reports none when there is none", async () => {
		const home = ledgerHome()
		const data = JSON.parse((await capture(["doctor", "--json"], { TRAJ_HOME: home })).out)
		expect(data.database.preMigrationCopies).toEqual([])
	})
})
