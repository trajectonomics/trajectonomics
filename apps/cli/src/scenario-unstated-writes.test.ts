// A write clears a template default by changing it, by a Set, or by taking its item away (cli ADR-0084).
import { describe, expect, it } from "bun:test"
import { projectionHome } from "./projection/testing"
import { applyScenario, resultOf, scenario } from "./scenario-test-support"

type Item = { kind: string; path: string }
type Account = { id: string; kind: string; rate: number }
type Document = {
	accounts: Account[]
	flows: { id: string; amount: number }[]
	economy: { inflation: number }
}

const AS_OF = "2026-03-31"

async function shown(home: string, name: string) {
	const res = await scenario(home, ["show", name])
	expect(res.code).toBe(0)
	return resultOf(res).scenario as { contentHash: string; document: Document; assumed: Item[] }
}

/** The template-default paths a plan lists, in order. */
async function pathsOf(home: string, name = "start"): Promise<string[]> {
	return (await shown(home, name)).assumed
		.filter((item) => item.kind === "template-default")
		.map((item) => item.path)
}

async function templateHome(): Promise<string> {
	const home = await projectionHome()
	expect((await scenario(home, ["apply", "start", "--template", "--as-of", AS_OF])).code).toBe(0)
	return home
}

describe("a write clears the values traj wrote", () => {
	it("a Set to another value clears only that path", async () => {
		const home = await templateHome()
		const before = await pathsOf(home)
		const res = await scenario(home, ["apply", "start", "--set", "economy.inflation=100"])
		expect(res.code).toBe(0)
		const after = await pathsOf(home)
		expect(after).not.toContain("economy.inflation")
		expect(after).toEqual(before.filter((path) => path !== "economy.inflation"))
	})

	it("a Set to the same value clears it, and the contentHash stays", async () => {
		const home = await templateHome()
		const before = await shown(home, "start")
		const res = await scenario(home, ["apply", "start", "--set", "economy.inflation=0"])
		expect(res.code).toBe(0)
		expect(resultOf(res)).toMatchObject({
			status: "updated",
			scenario: { contentHash: before.contentHash },
		})
		expect(await pathsOf(home)).not.toContain("economy.inflation")
	})

	it("a Set on an Account clears everything under it", async () => {
		const home = await templateHome()
		const document = (await shown(home, "start")).document
		const account = document.accounts[0]!
		const value = JSON.stringify(account)
		const res = await scenario(home, ["apply", "start", "--set", `accounts.${account.id}=${value}`])
		expect(res.code).toBe(0)
		const after = await pathsOf(home)
		expect(after.filter((path) => path.startsWith(`accounts.${account.id}.`))).toEqual([])
		expect(after).toContain(`accounts.${document.accounts[1]?.id}.rate`)
	})

	it("--without drops the Flow's amount", async () => {
		const home = await templateHome()
		const res = await scenario(home, ["apply", "start", "--without", "flows.spending"])
		expect(res.code).toBe(0)
		const after = await pathsOf(home)
		expect(after).not.toContain("flows.spending.amount")
		expect(after).toContain("flows.salary.amount")
	})

	it("a --file document clears a changed rate and keeps an equal one", async () => {
		const home = await templateHome()
		const document = (await shown(home, "start")).document
		const account = document.accounts[0]!
		const changed = {
			...document,
			accounts: document.accounts.map((item) =>
				item.id === account.id ? { ...item, rate: 100 } : item,
			),
		}
		const res = await applyScenario(home, "start", changed)
		expect(res.code).toBe(0)
		const after = await pathsOf(home)
		expect(after).not.toContain(`accounts.${account.id}.rate`)
		expect(after).toContain("economy.inflation")
	})

	it("a household write keeps every path", async () => {
		const home = await templateHome()
		const before = await pathsOf(home)
		const household = {
			schemaVersion: 1,
			people: [{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }],
			anchors: [],
		}
		const res = await scenario(
			home,
			["household", "start", "--file", "-"],
			JSON.stringify(household),
		)
		expect(res.code).toBe(0)
		expect(await pathsOf(home)).toEqual(before)
	})

	it("a tax write keeps every path", async () => {
		const home = await templateHome()
		const before = await pathsOf(home)
		const res = await scenario(home, [
			"tax",
			"start",
			"--tax",
			"th-2026",
			"--label",
			"salary=income.section40_1",
		])
		expect(res.code).toBe(0)
		expect(await pathsOf(home)).toEqual(before)
	})

	it("a fork copies every path, and its Set clears what it names", async () => {
		const home = await templateHome()
		const before = await pathsOf(home)
		expect((await scenario(home, ["fork", "start", "copy"])).code).toBe(0)
		expect(await pathsOf(home, "copy")).toEqual(before)
		const res = await scenario(home, ["fork", "start", "second", "--set", "economy.inflation=100"])
		expect(res.code).toBe(0)
		const second = await pathsOf(home, "second")
		expect(second).not.toContain("economy.inflation")
		expect(second).toEqual(before.filter((path) => path !== "economy.inflation"))
		expect(await pathsOf(home)).toEqual(before)
	})

	it("a --file create lists none", async () => {
		const home = await templateHome()
		const document = (await shown(home, "start")).document
		const res = await applyScenario(home, "fresh", document)
		expect(res.code).toBe(0)
		expect((await shown(home, "fresh")).assumed).toEqual([])
	})
})
