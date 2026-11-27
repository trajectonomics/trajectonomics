import { describe, expect, test } from "bun:test"
import type { HostConfig } from "../src/hourly/config"
import { hostArgv, quotaArgv, usageArgv } from "../src/hourly/host"

const LOCAL: HostConfig = {
	name: "synthetic-local",
	ssh: null,
	bun: "/synthetic/bun",
	collectorDir: "/synthetic/collector",
	quota: true,
	skipOpenCodeBefore: null,
}

const REMOTE: HostConfig = {
	...LOCAL,
	name: "synthetic-remote",
	ssh: "synthetic-remote",
	skipOpenCodeBefore: "2026-10-23T14:00:00.000Z",
}

const SINCE = "2026-11-27T04:00:00.000Z"

describe("hostArgv", () => {
	test("runs locally without a shell", () => {
		expect(usageArgv(LOCAL, SINCE)).toEqual([
			"/synthetic/bun",
			"/synthetic/collector/src/cli.ts",
			"usage",
			"--since",
			SINCE,
		])
	})

	test("adds the batch-mode ssh options for a remote host", () => {
		expect(usageArgv(REMOTE, SINCE)).toEqual([
			"ssh",
			"-o",
			"BatchMode=yes",
			"-o",
			"ConnectTimeout=10",
			"synthetic-remote",
			"/synthetic/bun",
			"/synthetic/collector/src/cli.ts",
			"usage",
			"--since",
			SINCE,
			"--skip-opencode-before",
			"2026-10-23T14:00:00.000Z",
		])
	})

	test("builds the quota command through the same host", () => {
		expect(quotaArgv(REMOTE).slice(-2)).toEqual(["/synthetic/collector/src/cli.ts", "quota"])
		expect(hostArgv(LOCAL, ["quota"]).slice(-1)).toEqual(["quota"])
	})
})
