import { afterEach, describe, expect, it } from "bun:test"
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { run } from "../cli"
import { type RunRecord, usageEvent } from "../telemetry/event"
import { capture } from "../test-support"
import { HEAD } from "./index"
import { copyPath } from "./pre-migration"
import { atVersion, cleanUpHomes, dbOf, tracked } from "./pre-migration-test-support"
import { ledgerHome } from "./testing"

afterEach(cleanUpHomes)

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

	it("reports none when there is none", async () => {
		const home = tracked(ledgerHome())
		const data = JSON.parse((await capture(["doctor", "--json"], { TRAJ_HOME: home })).out)
		expect(data.database.preMigrationCopies).toEqual([])
	})
})
