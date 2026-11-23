import { describe, expect, it } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { check } from "./check"

/** The README is the page under test; its code is the code a reader copies. */
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8")
const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
const ENTRY = fileURLToPath(new URL("./index.ts", import.meta.url))
const PACKAGE = "@trajectonomics/core/sim"

interface Block {
	readonly info: string
	readonly code: string
}

const blocks: readonly Block[] = [...readme.matchAll(/^```([^\n]*)\n([\s\S]*?)^```$/gm)].map(
	(m) => ({ info: (m[1] ?? "").trim(), code: m[2] ?? "" }),
)

/** The `text` block right after block `i`, which holds exactly what block `i` prints. */
function printedBy(i: number): string {
	const next = blocks[i + 1]
	return next?.info === "text" ? next.code : ""
}

/** Runs one complete module in a child Bun process, in a directory that never outlives the call. */
function run(code: string): { status: number | null; stdout: string; stderr: string } {
	const dir = mkdtempSync(join(tmpdir(), "sim-readme-"))
	try {
		const file = join(dir, "example.ts")
		writeFileSync(file, code.replaceAll(`"${PACKAGE}"`, JSON.stringify(ENTRY)))
		const done = Bun.spawnSync([process.execPath, file], { cwd: dir })
		return { status: done.exitCode, stdout: done.stdout.toString(), stderr: done.stderr.toString() }
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
}

/** Imports an illustrative object literal in-process, as the value it denotes. */
async function literalOf(code: string): Promise<{ readonly id: string }> {
	const dir = mkdtempSync(join(tmpdir(), "sim-readme-"))
	try {
		const file = join(dir, "fragment.ts")
		writeFileSync(file, `export default (${code})\n`)
		return (await import(file)).default
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
}

/** Every illustrative fragment of the page, as the value it denotes. */
function fragments(): Promise<readonly { readonly id: string }[]> {
	return Promise.all(blocks.filter((b) => b.info === "ts fragment").map((b) => literalOf(b.code)))
}

describe("README examples", () => {
	const modules = blocks.flatMap((block, i) => (block.info === "ts" ? [{ block, i }] : []))

	it("has at least one complete example to run", () => {
		expect(modules.length).toBeGreaterThan(0)
	})

	it.each(modules)("runs the ts block %# and prints what the page shows", ({ block, i }) => {
		const done = run(block.code)
		expect({ status: done.status, stderr: done.stderr }).toEqual({ status: 0, stderr: "" })
		expect(done.stdout).toBe(printedBy(i))
	})

	it("accepts the Levy, Dated constant and Derived amount fragments", async () => {
		const values = (await fragments()).filter((v) => v.id !== "spending")
		const byId = (id: string) => values.find((v) => v.id === id)
		expect(values.map((v) => v.id).sort()).toEqual(["due", "rent", "salary"])
		expect(check(...levyInputs(byId("salary"), byId("due"), byId("rent")))).toEqual([])
	})

	it("accepts the Spending rule fragments", async () => {
		const rules = (await fragments()).filter((v) => v.id === "spending")
		expect(rules).toHaveLength(3)
		for (const rule of rules) expect(check(...ruleInputs(rule))).toEqual([])
	})

	it("lists every step of the check script in the Scripts section", () => {
		const steps = String(manifest.scripts.check)
			.split("&&")
			.map((part) => part.trim().split(/\s+/).at(-1))
			.map((step) => (step?.endsWith("build-unless-turbo.ts") ? "build" : step))
		const bullet = readme.split("\n").find((line) => line.startsWith("- `bun run check`")) ?? ""
		expect(steps).toEqual(["lint", "typecheck", "test", "build", "parity", "lint:package"])
		for (const step of steps) expect(bullet).toContain(`\`${step}\``)
	})
})

/** The Baseline, Scenario and Timeline that a rule fragment sits in, over `funds` and `rmf`. */
function ruleInputs(flow: unknown): [unknown, unknown, unknown] {
	const asset = (id: string) => ({ id, kind: "asset", rate: 300 })
	const scenario = {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [asset("cash"), asset("funds"), asset("rmf")],
		flows: [flow],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
	}
	const baseline = { schemaVersion: 1, balances: [{ account: "cash", amount: 0 }] }
	return [baseline, scenario, { start: "2026-01-01", horizon: "2036-12-31", resolution: "month" }]
}

/** The Baseline, Scenario and Timeline that the Levies fragments sit in. */
function levyInputs(salary: unknown, due: unknown, rent: unknown): [unknown, unknown, unknown] {
	const carryIn = [{ periodStart: "2025-01-01", tallies: [], prepaid: 0 }]
	const levy = { period: { month: 1, day: 1 }, due: "due", carryIn }
	const scenario = {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		flows: [salary, rent],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
		levies: [
			{ ...levy, id: "national", settlement: { month: 3, day: 31 }, measures: [due] },
			{
				...levy,
				id: "local",
				settlement: { month: 6, day: 30 },
				measures: [{ id: "due", op: "const", value: 0 }],
			},
		],
	}
	const baseline = { schemaVersion: 1, balances: [{ account: "cash", amount: 0 }] }
	return [baseline, scenario, { start: "2026-01-01", horizon: "2027-12-31", resolution: "month" }]
}
