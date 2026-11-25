import { describe, expect, it } from "bun:test"
import { FIXED_SOURCE_VARIABLE } from "./fixed-source"
import { makeTempDir } from "./temp-dir"

const ENTRY = new URL("./demo-entry.ts", import.meta.url).pathname
const INDEX = new URL("./index.ts", import.meta.url).pathname

/** Runs the demo entry point from source with `extra` added to a clean environment. */
async function demo(argv: string[], extra: Record<string, string>) {
	const proc = Bun.spawn(["bun", ENTRY, ...argv], {
		env: { PATH: process.env["PATH"] ?? "", DO_NOT_TRACK: "1", ...extra },
		stdout: "pipe",
		stderr: "pipe",
	})
	const [out, err] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	])
	return { code: await proc.exited, out, err }
}

describe("the demo entry point", () => {
	it("refuses a malformed TRAJ_FIXED_SOURCE with exit 2 and runs nothing", async () => {
		const res = await demo(["--version"], { [FIXED_SOURCE_VARIABLE]: "tomorrow" })
		expect(res.code).toBe(2)
		expect(res.err).toContain(FIXED_SOURCE_VARIABLE)
		expect(res.out).toBe("")
	})

	it("writes the same ids in two data directories, as a spawned process", async () => {
		const ids: string[] = []
		for (const _ of [0, 1]) {
			const env = {
				TRAJ_HOME: makeTempDir(),
				[FIXED_SOURCE_VARIABLE]: "2026-10-31T00:00:00.000Z#42",
			}
			expect((await demo(["init", "--json"], env)).code).toBe(0)
			const add = await demo(
				["account", "add", "Cash", "--type", "asset", "--currency", "THB", "--json"],
				env,
			)
			expect(add.code).toBe(0)
			ids.push(JSON.parse(add.out).account.id)
		}
		expect(ids[0]).toBe(ids[1])
		expect(ids[0]?.endsWith("-7000-8000-00000000002a")).toBe(true)
	})
})

describe("a shipped traj", () => {
	it("holds no trace of the fixed source: the bundle of index.ts never reaches it", async () => {
		const built = await Bun.build({ entrypoints: [INDEX], target: "bun" })
		expect(built.success).toBe(true)
		const text = (await Promise.all(built.outputs.map((output) => output.text()))).join("\n")
		expect(text).not.toContain(FIXED_SOURCE_VARIABLE)
		expect(text).not.toContain("fixed source")
	})

	it("is built from no module that imports demo-entry or fixed-source but those and their tests", async () => {
		const importers: string[] = []
		for await (const file of new Bun.Glob("**/*.ts").scan({
			cwd: new URL(".", import.meta.url).pathname,
		})) {
			const text = await Bun.file(new URL(file, import.meta.url)).text()
			if (/from "\.{1,2}\/(?:[\w-]+\/)*(demo-entry|fixed-source)"/.test(text)) importers.push(file)
		}
		expect(importers.sort()).toEqual([
			"demo-entry.test.ts",
			"demo-entry.ts",
			"fixed-source.test.ts",
		])
	})
})
