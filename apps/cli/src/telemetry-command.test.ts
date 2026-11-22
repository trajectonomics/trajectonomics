import { describe, expect, it } from "bun:test"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { makeTempDir } from "./temp-dir"
import { capture, errorOf } from "./test-support"

const ID = "0194b000-0000-7000-8000-00000000000a"

/** A fresh config home, so each case reads and writes only its own telemetry.json. */
const configHome = (): string => makeTempDir("traj-telemetry-cmd-")

/** The env every case runs under: its own config home and no opt-out or CI variable. */
const envWith = (xdg: string): Record<string, string | undefined> => ({
	XDG_CONFIG_HOME: xdg,
	DO_NOT_TRACK: undefined,
	TRAJ_TELEMETRY: undefined,
	CI: undefined,
})

const stateFile = (xdg: string): string => join(xdg, "traj", "telemetry.json")
const stateOf = (xdg: string): unknown => JSON.parse(readFileSync(stateFile(xdg), "utf8"))

/** Writes a state file as an earlier run would have left it. */
function seed(xdg: string, state: unknown): void {
	mkdirSync(join(xdg, "traj"), { recursive: true })
	writeFileSync(stateFile(xdg), JSON.stringify(state))
}

describe("traj telemetry", () => {
	it("reports the decision and the state file, and writes nothing", async () => {
		const xdg = configHome()
		const res = await capture(["telemetry", "status", "--json"], envWith(xdg))
		expect(res.code).toBe(0)
		// The test binary is a development build (version 0.0.0), so it never counts.
		expect(JSON.parse(res.out)).toEqual({
			enabled: false,
			reason: "development_build",
			file: stateFile(xdg),
		})
		expect(existsSync(join(xdg, "traj"))).toBe(false)
	})

	it("turns counting off, writes the choice, and drops the id", async () => {
		const xdg = configHome()
		seed(xdg, { enabled: true, id: ID, noticeShown: true })
		const off = await capture(["telemetry", "off", "--json"], envWith(xdg))
		expect(off.code).toBe(0)
		expect(JSON.parse(off.out)).toEqual({
			enabled: false,
			reason: "turned_off",
			file: stateFile(xdg),
		})
		expect(stateOf(xdg)).toEqual({ enabled: false, noticeShown: true })
	})

	it("keeps the id when turning on, and reports the cause that still stops it", async () => {
		const xdg = configHome()
		seed(xdg, { enabled: false })
		const blocked = await capture(["telemetry", "on", "--json"], {
			...envWith(xdg),
			DO_NOT_TRACK: "1",
		})
		expect(JSON.parse(blocked.out)).toMatchObject({ enabled: false, reason: "do_not_track" })
		expect(stateOf(xdg)).toEqual({ enabled: true })

		seed(xdg, { enabled: false, id: ID })
		await capture(["telemetry", "on", "--json"], envWith(xdg))
		expect(stateOf(xdg)).toEqual({ enabled: true, id: ID })
	})

	it("reports a state file it cannot write as a filesystem error, not a crash", async () => {
		const parent = configHome()
		const blocked = join(parent, "not-a-dir")
		writeFileSync(blocked, "")
		const res = await capture(["telemetry", "off", "--json"], envWith(blocked))
		expect(res.code).toBe(1)
		expect(errorOf(res)).toMatchObject({ code: "not_a_directory", exitCode: 1 })
	})

	it("takes no arguments", async () => {
		const res = await capture(["telemetry", "status", "extra", "--json"], envWith(configHome()))
		expect(res.code).toBe(2)
	})
})
