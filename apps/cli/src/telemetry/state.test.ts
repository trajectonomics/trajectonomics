import { describe, expect, it } from "bun:test"
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
	configDirectory,
	DEFAULT_STATE,
	readState,
	STATE_FILE,
	stateFilePath,
	writeState,
} from "./state"

const fresh = (): string => mkdtempSync(join(tmpdir(), "traj-telemetry-state-"))
const ID = "0194b000-0000-7000-8000-00000000000a"

describe("configDirectory", () => {
	it("uses XDG_CONFIG_HOME, then ~/.config, outside the data directory", () => {
		expect(configDirectory({ XDG_CONFIG_HOME: "/x/config" }, "linux", "/home/u")).toBe(
			join("/x/config", "traj"),
		)
		expect(configDirectory({}, "linux", "/home/u")).toBe(join("/home/u", ".config", "traj"))
		expect(configDirectory({ TRAJ_HOME: "/data" }, "darwin", "/home/u")).toBe(
			join("/home/u", ".config", "traj"),
		)
	})

	it("uses APPDATA on Windows, and its default when APPDATA is unset", () => {
		expect(configDirectory({ APPDATA: "C:\\Roaming" }, "win32", "C:\\u")).toBe(
			join("C:\\Roaming", "traj"),
		)
		expect(configDirectory({}, "win32", "C:\\u")).toBe(join("C:\\u", "AppData", "Roaming", "traj"))
	})

	it("names the state file telemetry.json inside it", () => {
		expect(STATE_FILE).toBe("telemetry.json")
		expect(stateFilePath({ XDG_CONFIG_HOME: "/x" }, "linux", "/h")).toBe(
			join("/x", "traj", "telemetry.json"),
		)
	})
})

describe("readState", () => {
	it("reads as the default when the file is missing", () => {
		expect(readState({ XDG_CONFIG_HOME: fresh() }, "linux")).toEqual(DEFAULT_STATE)
	})

	it("reads as the default when the file is malformed, and never throws", () => {
		const config = fresh()
		mkdirSync(join(config, "traj"))
		writeFileSync(join(config, "traj", STATE_FILE), "{ not json")
		expect(readState({ XDG_CONFIG_HOME: config }, "linux")).toEqual(DEFAULT_STATE)
		writeFileSync(join(config, "traj", STATE_FILE), JSON.stringify({ enabled: "no" }))
		expect(readState({ XDG_CONFIG_HOME: config }, "linux")).toEqual(DEFAULT_STATE)
	})

	it("reads a stored choice and id back", () => {
		const config = fresh()
		mkdirSync(join(config, "traj"))
		writeFileSync(
			join(config, "traj", STATE_FILE),
			JSON.stringify({ enabled: false, id: ID, noticeShown: true }),
		)
		expect(readState({ XDG_CONFIG_HOME: config }, "linux")).toEqual({
			enabled: false,
			id: ID,
			noticeShown: true,
		})
	})
})

describe("writeState", () => {
	it("creates the directory and writes the state, leaving no temporary file behind", () => {
		const config = join(fresh(), "missing", "config")
		const env = { XDG_CONFIG_HOME: config }
		expect(writeState(env, { enabled: true, id: ID }, "linux")).toBeUndefined()
		expect(readState(env, "linux")).toEqual({ enabled: true, id: ID })
		expect(readdirSync(join(config, "traj"))).toEqual([STATE_FILE])
		expect(JSON.parse(readFileSync(join(config, "traj", STATE_FILE), "utf8"))).toEqual({
			enabled: true,
			id: ID,
		})
	})

	it("returns the typed failure when the config path is a file, as not_a_directory", () => {
		const blocked = join(fresh(), "file")
		writeFileSync(blocked, "not a directory")
		const failure = writeState({ XDG_CONFIG_HOME: blocked }, { enabled: false }, "linux")
		expect(failure?.body.code).toBe("not_a_directory")
		expect(failure?.body.exitCode).toBe(1)
	})
})
