import { describe, expect, it } from "bun:test"
import { run } from "./cli"
import { counterId, parseFixedSource } from "./fixed-source"
import { makeTempDir } from "./temp-dir"

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const INSTANT = "2026-10-31T00:00:00.000Z"

function must(value: string) {
	const source = parseFixedSource(value)
	if (source === undefined) throw new Error(`${value} should parse`)
	return source
}

describe("the fixed source", () => {
	it("refuses a value that is not <instant>#<seed>", () => {
		for (const bad of [
			"",
			INSTANT,
			`${INSTANT}#`,
			`#5`,
			`2026-10-31#5`,
			`2026-02-30T00:00:00.000Z#5`,
			`2026-10-31T00:00:00Z#5`,
			`${INSTANT}#-1`,
			`${INSTANT}#1.5`,
			`${INSTANT}#${2n ** 62n}`,
			`${INSTANT}#5-`,
			`${INSTANT}#5-x`,
			`1969-12-31T23:59:59.999Z#0`,
		]) {
			expect(parseFixedSource(bad)).toBeUndefined()
		}
	})

	it("answers the same instant on every reading, as a new Date each time", () => {
		const { clock } = must(`${INSTANT}#0`)
		expect(clock().toISOString()).toBe(INSTANT)
		expect(clock()).not.toBe(clock())
		expect(clock().toISOString()).toBe(INSTANT)
	})

	it("mints valid UUIDv7s whose time part is the instant it is given", () => {
		const { clock, newId } = must(`${INSTANT}#0`)
		const id = newId(clock())
		expect(id).toMatch(UUID_V7)
		const millis = Number.parseInt(id.replaceAll("-", "").slice(0, 12), 16)
		expect(new Date(millis).toISOString()).toBe(INSTANT)
	})

	it("counts up from the seed, so ids sort in the order they were minted", () => {
		const { clock, newId } = must(`${INSTANT}#4095`)
		const ids = Array.from({ length: 5 }, () => newId(clock()))
		expect(ids[0]?.endsWith("-8000-000000000fff")).toBe(true)
		expect([...ids].sort()).toEqual(ids)
		expect(new Set(ids).size).toBe(5)
		expect(ids[4]?.endsWith("-000000001003")).toBe(true)
	})

	it("gives two sources with the same value the same ids", () => {
		const a = must(`${INSTANT}#7`)
		const b = must(`${INSTANT}#7`)
		for (let i = 0; i < 3; i++) expect(a.newId(a.clock())).toBe(b.newId(b.clock()))
	})

	it("throws when a run mints as many ids as its limit allows, before the next run's seed", () => {
		const { clock, newId } = must(`${INSTANT}#10-12`)
		expect(newId(clock()).endsWith("-00000000000a")).toBe(true)
		expect(newId(clock()).endsWith("-00000000000b")).toBe(true)
		expect(() => newId(clock())).toThrow("the fixed source ran out of ids")
	})

	it("refuses a limit that is not above the seed, or above the 62 random bits", () => {
		for (const bad of [`${INSTANT}#5-5`, `${INSTANT}#5-4`, `${INSTANT}#5-${(1n << 62n) + 1n}`]) {
			expect(parseFixedSource(bad)).toBeUndefined()
		}
		expect(parseFixedSource(`${INSTANT}#5-${1n << 62n}`)).toBeDefined()
	})

	it("keeps the counter inside the 62 random bits", () => {
		const last = (1n << 62n) - 1n
		expect(counterId(new Date(0), last)).toMatch(UUID_V7)
		const { clock, newId } = must(`${INSTANT}#${last}`)
		expect(newId(clock())).toMatch(UUID_V7)
		expect(() => newId(clock())).toThrow()
	})
})

/** Runs one command with `source` and returns its exit code and the lines it printed. */
async function traj(home: string, argv: string[], value: string) {
	const out: string[] = []
	const err: string[] = []
	const code = await run(
		[...argv, "--json"],
		{ out: (line) => out.push(line), err: (line) => err.push(line) },
		{ TRAJ_HOME: home },
		undefined,
		undefined,
		must(value),
	)
	return { code, out: out.join("\n"), err: err.join("\n") }
}

/** One ledger built under `value`: two accounts, listed. */
async function ledgerUnder(value: string): Promise<string> {
	const home = makeTempDir()
	expect((await traj(home, ["init"], value)).code).toBe(0)
	const first = ["account", "add", "Cash", "--type", "asset", "--currency", "THB"]
	expect((await traj(home, first, value)).code).toBe(0)
	const second = ["account", "add", "Opening", "--type", "equity", "--currency", "THB"]
	expect((await traj(home, second, `${INSTANT}#1000`)).code).toBe(0)
	const dump = await traj(home, ["account", "list"], value)
	expect(dump.code).toBe(0)
	return dump.out
}

describe("a write under the fixed source", () => {
	it("writes the same bytes twice, in two data directories", async () => {
		const a = await ledgerUnder(`${INSTANT}#0`)
		const b = await ledgerUnder(`${INSTANT}#0`)
		expect(a).toBe(b)
		expect(a).toContain(INSTANT)
	})

	it("writes other ids under another seed", async () => {
		expect(await ledgerUnder(`${INSTANT}#0`)).not.toBe(await ledgerUnder(`${INSTANT}#1`))
	})
})
