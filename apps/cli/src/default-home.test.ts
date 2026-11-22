import { describe, expect, it } from "bun:test"
import { existsSync } from "node:fs"
import { ALLOW_DEFAULT_HOME, dataDirectory, defaultHomeRefusal } from "./data-directory"
import { isAppError } from "./errors"
import { tempHome } from "./store/testing"
import { capture, errorOf } from "./test-support"

// Every test run is a development build (version 0.0.0), so a run with no TRAJ_HOME is the case
// the guard refuses. The sandbox HOME makes sure that nothing here can reach the real ledger.
describe("a development build and the default data directory", () => {
	it("refuses a command that opens the data directory when TRAJ_HOME is unset", async () => {
		const res = await capture(["account", "list", "--json"], {})
		expect(res.code).toBe(3)
		const error = errorOf(res)
		expect(error.code).toBe("default_home_refused")
		expect(error.hint).toContain("TRAJ_HOME")
		expect(error.hint).toContain(ALLOW_DEFAULT_HOME)
	})

	it("refuses an empty TRAJ_HOME, which resolves to the default directory", async () => {
		const res = await capture(["init", "--json"], { TRAJ_HOME: "" })
		expect(errorOf(res).code).toBe("default_home_refused")
	})

	it("refuses every leaf that resolves the directory itself", async () => {
		for (const argv of [["init"], ["doctor"], ["data", "remove"], ["backup", "--out", "x"]]) {
			const res = await capture([...argv, "--json"], {})
			expect(errorOf(res).code).toBe("default_home_refused")
		}
	})

	it("runs with TRAJ_HOME set", async () => {
		const home = tempHome()
		const res = await capture(["init", "--json"], { TRAJ_HOME: home })
		expect(res.code).toBe(0)
		expect(existsSync(JSON.parse(res.out).database)).toBe(true)
	})

	it("lets the override through when the real entry point runs", async () => {
		// A child process whose HOME is a scratch directory, so `~/.traj` is never the owner's.
		const home = tempHome()
		const spawn = (extra: Record<string, string>) => {
			const child = Bun.spawnSync(["bun", "src/index.ts", "account", "list", "--json"], {
				cwd: import.meta.dir.replace(/\/src$/, ""),
				env: { PATH: process.env["PATH"] ?? "", HOME: home, DO_NOT_TRACK: "1", ...extra },
			})
			return { code: child.exitCode, error: JSON.parse(child.stderr.toString()).error }
		}
		const refused = spawn({})
		expect(refused.code).toBe(3)
		expect(refused.error.code).toBe("default_home_refused")
		const allowed = spawn({ [ALLOW_DEFAULT_HOME]: "1" })
		expect(allowed.error.code).toBe("ledger_missing")
		expect(allowed.error.message).toContain(home)
	})

	it("accepts the override as the value 1", () => {
		expect(defaultHomeRefusal({ [ALLOW_DEFAULT_HOME]: "1" })).toBeUndefined()
	})

	it("does not read the override from any other value than 1", () => {
		for (const value of ["0", "", "true", "yes"]) {
			const refused = defaultHomeRefusal({ [ALLOW_DEFAULT_HOME]: value })
			expect(isAppError(refused)).toBe(true)
		}
	})

	it("leaves a published release unaffected", () => {
		expect(defaultHomeRefusal({}, "0.7.0")).toBeUndefined()
		expect(defaultHomeRefusal({ TRAJ_HOME: "" }, "1.0.0")).toBeUndefined()
		expect(defaultHomeRefusal({}, "0.8.0-rc.1")).toBeUndefined()
	})

	it("names the directory it would have opened", () => {
		const refused = defaultHomeRefusal({})
		expect(isAppError(refused) ? refused.body.message : "").toContain(dataDirectory({}))
	})

	it("does not apply to commands that never open the data directory", async () => {
		for (const argv of [["version"], ["--version"], ["help"], ["schema"], ["schema", "init"]]) {
			const res = await capture(argv, {})
			expect(res.code).toBe(0)
		}
	})
})
