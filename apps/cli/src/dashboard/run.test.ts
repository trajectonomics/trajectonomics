import { describe, expect, it } from "bun:test"
import { fileURLToPath } from "node:url"
import { selfCommand } from "./run"

describe("selfCommand", () => {
	it("runs the compiled binary on its own", () => {
		expect(selfCommand("/usr/local/bin/traj", "/$bunfs/root/traj")).toEqual({
			binary: "/usr/local/bin/traj",
			prefix: [],
		})
		expect(selfCommand("C:\\traj.exe", "B:\\~BUN\\root\\traj.exe").prefix).toEqual([])
	})

	it("runs Bun on the entry file from a checkout", () => {
		const entry = fileURLToPath(new URL("../index.ts", import.meta.url))
		expect(selfCommand("/usr/bin/bun", "/repo/apps/cli/src/dashboard/run.ts")).toEqual({
			binary: "/usr/bin/bun",
			prefix: [entry],
		})
	})
})
