import { describe, expect, test } from "bun:test"
import type { FetchLike } from "../src/quota/fetch"
import type { CommandRunner } from "../src/quota/sample"
import { sampleQuota } from "../src/quota/sample"
import {
	AGY,
	ANTIGRAVITY_BODY,
	ANTIGRAVITY_PATH,
	ANTIGRAVITY_URL,
	antigravityTokenFile,
	fakeFetch,
	MUSE_STDOUT,
	makeDeps,
	NOW,
} from "./support/quota-sample"

function expiredFiles(): Record<string, string> {
	return { [ANTIGRAVITY_PATH]: antigravityTokenFile("synthetic-antigravity-expired", NOW - 60_000) }
}

describe("Antigravity token refresh", () => {
	test("refreshes an expired token once with agy, then samples the new token", async () => {
		const files = expiredFiles()
		const commands: string[][] = []
		const runCommand: CommandRunner = async (argv) => {
			commands.push([...argv])
			if (argv[0] === AGY) {
				files[ANTIGRAVITY_PATH] = antigravityTokenFile("synthetic-antigravity-fresh", NOW + 60_000)
				return { exitCode: 0, stdout: "synthetic model list" }
			}
			return { exitCode: 0, stdout: MUSE_STDOUT }
		}
		const { calls, fetch } = fakeFetch({ [ANTIGRAVITY_URL]: { body: ANTIGRAVITY_BODY } })
		const { deps, logs } = makeDeps(fetch, files, runCommand)
		const rows = await sampleQuota(deps)
		expect(commands.filter((argv) => argv[0] === AGY)).toEqual([[AGY, "models"]])
		expect(calls.map((call) => call.url)).toEqual([ANTIGRAVITY_URL])
		expect(calls[0]?.init.headers["Authorization"]).toBe("Bearer synthetic-antigravity-fresh")
		expect(rows.filter((row) => row.plan === "antigravity")).toHaveLength(2)
		expect(logs).toContain("quota: antigravity sampled 2 rows")
	})

	test("skips Antigravity and runs agy only once when the refresh yields no fresh token", async () => {
		const commands: string[][] = []
		const runCommand: CommandRunner = async (argv) => {
			commands.push([...argv])
			return argv[0] === AGY ? { exitCode: 0, stdout: "" } : { exitCode: 0, stdout: MUSE_STDOUT }
		}
		const fetch: FetchLike = async () => {
			throw new Error("no request expected")
		}
		const { deps, logs } = makeDeps(fetch, expiredFiles(), runCommand)
		const rows = await sampleQuota(deps)
		expect(commands.filter((argv) => argv[0] === AGY)).toEqual([[AGY, "models"]])
		expect(rows.some((row) => row.plan === "antigravity")).toBe(false)
		expect(logs).toContain("quota: antigravity skipped (credentials expired)")
	})

	test("does not run agy when the Antigravity token is still fresh", async () => {
		const files = { [ANTIGRAVITY_PATH]: antigravityTokenFile("synthetic-fresh", NOW + 60_000) }
		const commands: string[][] = []
		const runCommand: CommandRunner = async (argv) => {
			commands.push([...argv])
			return { exitCode: 0, stdout: MUSE_STDOUT }
		}
		const { calls, fetch } = fakeFetch({ [ANTIGRAVITY_URL]: { body: ANTIGRAVITY_BODY } })
		const { deps } = makeDeps(fetch, files, runCommand)
		const rows = await sampleQuota(deps)
		expect(commands.filter((argv) => argv[0] === AGY)).toEqual([])
		expect(rows.filter((row) => row.plan === "antigravity")).toHaveLength(2)
		expect(calls.map((call) => call.url)).toEqual([ANTIGRAVITY_URL])
	})
})
