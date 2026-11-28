// `scenario apply <name> --template --as-of` seeds the values `traj` wrote (cli ADR-0084).
import { describe, expect, it } from "bun:test"
import { projectionHome } from "./projection/testing"
import { errorOf, resultOf, scenario } from "./scenario-test-support"
import { capture } from "./test-support"

type Item = { kind: string; path: string; value: number | string; hint: string }
type Shown = { contentHash: string; document: Record<string, unknown>; assumed: Item[] }
type Account = { id: string }

const AS_OF = "2026-03-31"

/** `traj scenario apply start --template --as-of`, with optional extra flags. */
function templateWrite(home: string, extra: readonly string[] = []) {
	return scenario(home, ["apply", "start", "--template", "--as-of", AS_OF, ...extra])
}

async function shown(home: string, name = "start", decimal = false): Promise<Shown> {
	const args = ["show", name, ...(decimal ? ["--decimal"] : [])]
	const res = await scenario(home, args)
	expect(res.code).toBe(0)
	return resultOf(res).scenario as Shown
}

/** The words of a printed command, split where a shell would. */
function argvOf(command: string): string[] {
	return [...command.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/g)].map(
		(match) => match[1] ?? match[2] ?? match[3] ?? "",
	)
}

async function templateHome(): Promise<string> {
	const home = await projectionHome()
	expect((await templateWrite(home)).code).toBe(0)
	return home
}

describe("a template write remembers the values traj wrote", () => {
	it("lists inflation, every Account's rate and every Flow's amount, in that order", async () => {
		const home = await templateHome()
		const read = await shown(home)
		expect(read.assumed.every((item) => item.kind === "template-default")).toBe(true)
		const paths = read.assumed.map((item) => item.path)
		const accounts = read.document["accounts"] as Account[]
		expect(paths[0]).toBe("economy.inflation")
		expect(paths.filter((path) => path.startsWith("accounts."))).toEqual(
			accounts.map((account) => `accounts.${account.id}.rate`),
		)
		expect(paths.filter((path) => path.startsWith("flows."))).toEqual([
			"flows.salary.amount",
			"flows.spending.amount",
		])
		expect(read.assumed[0]).toEqual({
			kind: "template-default",
			path: "economy.inflation",
			value: 0,
			hint: 'Run "traj scenario apply start --set economy.inflation=0" to state it, at this value or another.',
		})
	})

	it("states the printed value: a decimal amount is a string, a rate stays basis points", async () => {
		const home = await templateHome()
		const read = await shown(home, "start", true)
		const byPath = new Map(read.assumed.map((item) => [item.path, item.value]))
		expect(byPath.get("economy.inflation")).toBe(0)
		expect(byPath.get("flows.salary.amount")).toBe("0.00")
		const ratePath = read.assumed.find((item) => item.path.startsWith("accounts."))?.path ?? ""
		expect(byPath.get(ratePath)).toBe(0)
	})

	it("refuses a name a live plan holds, and writes nothing", async () => {
		const home = await projectionHome()
		const before = await shown(home, "base")
		const res = await scenario(home, ["apply", "base", "--template", "--as-of", AS_OF])
		expect(res.code).toBe(5)
		expect(errorOf(res).code).toBe("scenario_name_taken")
		expect((await shown(home, "base")).contentHash).toBe(before.contentHash)
	})

	it("refuses a name without an As-of, at asOf", async () => {
		const home = await projectionHome()
		const res = await scenario(home, ["apply", "start", "--template"])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--as-of" })
		expect(errorOf(res).hint).toContain("--as-of")
		expect((await scenario(home, ["show", "start"])).code).toBe(4)
	})

	it("rolls the write back under --dry-run", async () => {
		const home = await projectionHome()
		const res = await templateWrite(home, ["--dry-run"])
		expect(res.code).toBe(0)
		expect(resultOf(res)).toMatchObject({
			dryRun: true,
			status: "created",
			scenario: { id: null, name: "start" },
		})
		expect((await scenario(home, ["show", "start"])).code).toBe(4)
	})

	it("runs the hint as printed, and the item is gone with the contentHash unchanged", async () => {
		const home = await templateHome()
		const before = await shown(home)
		const item = before.assumed.find((entry) => entry.path === "economy.inflation")
		const command = item?.hint.match(/^Run "(traj .+)" to state it/)?.[1] ?? ""
		const argv = argvOf(command).slice(1)
		const ran = await capture(argv, { TRAJ_HOME: home, DO_NOT_TRACK: "1" })
		expect(ran.code).toBe(0)
		const after = await shown(home)
		expect(after.assumed.some((entry) => entry.path === "economy.inflation")).toBe(false)
		expect(after.assumed).toHaveLength(before.assumed.length - 1)
		expect(after.contentHash).toBe(before.contentHash)
	})
})
