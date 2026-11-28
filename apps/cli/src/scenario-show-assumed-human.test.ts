// The human block `scenario show` prints after its body (cli ADR-0083).
import { describe, expect, it } from "bun:test"
import { projectionHome } from "./projection/testing"
import { SALARY, tax } from "./scenario-tax-profile-support"
import { applyScenario, resultOf, scenario } from "./scenario-test-support"
import { capture } from "./test-support"

type AssumedItem = { kind: string; path: string; hint: string | null }

type Shown = { document: Record<string, unknown>; assumed: AssumedItem[] }

async function shown(home: string): Promise<Shown> {
	const res = await scenario(home, ["show", "base"])
	expect(res.code).toBe(0)
	return resultOf(res).scenario as Shown
}

/** A taxed plan with an unconfirmed figure, and one income Flow that carries no tax label. */
async function assumedHome(): Promise<string> {
	const home = await projectionHome()
	const taxed = await tax(home, [
		"base",
		"--tax",
		"th-2026",
		"--mortgage-interest",
		"30000",
		...SALARY,
	])
	expect(taxed.code).toBe(0)
	const document = (await shown(home)).document as { flows: Record<string, unknown>[] }
	const salary = document.flows.find((flow) => flow["id"] === "salary") ?? {}
	const { label: _label, ...unlabelled } = salary
	const applied = await applyScenario(home, "base", {
		...document,
		flows: [...document.flows, { ...unlabelled, id: "bonus" }],
	})
	expect(applied.code).toBe(0)
	return home
}

/** The words of a printed command, split where a shell would, for the two kinds of quote a hint uses. */
function argvOf(command: string): string[] {
	return [...command.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/g)].map(
		(match) => match[1] ?? match[2] ?? match[3] ?? "",
	)
}

describe("the human form of the values a plan assumes", () => {
	it("prints no block when the plan assumes nothing", async () => {
		const home = await projectionHome()
		const res = await capture(["scenario", "show", "base"], { TRAJ_HOME: home })
		expect(res.code).toBe(0)
		expect(res.out).not.toContain("This plan assumes")
		expect(res.out).not.toContain("assumed")
	})

	it("prints one line per item after the body, and the body names no assumed", async () => {
		const home = await assumedHome()
		const items = (await shown(home)).assumed
		expect(items.length).toBeGreaterThan(3)
		const res = await capture(["scenario", "show", "base"], { TRAJ_HOME: home })
		expect(res.code).toBe(0)
		const [body = "", ...rest] = res.out.split("\n\n")
		expect(body).not.toContain("assumed")
		const block = rest.join("\n\n")
		expect(block.startsWith("This plan assumes (values nobody stated):\n")).toBe(true)
		const lines = block.split("\n")
		expect(lines.filter((line) => line.startsWith("- "))).toHaveLength(items.length)
		expect(lines.filter((line) => line.startsWith("  hint: "))).toHaveLength(
			items.filter((item) => item.hint !== null).length,
		)
		expect(block).toContain("- flows.bonus.label (income with no tax label)")
		expect(block).toContain("(tax allowance not stated)")
		expect(block).toContain("(reported tax figure):")
	})

	it("runs the unlabelled-income hint as printed, and the item is gone afterwards", async () => {
		const home = await assumedHome()
		const before = (await shown(home)).assumed.find((item) => item.kind === "unlabelled-income")
		const command = before?.hint?.match(/^Run "(traj .+)" for a salary/)?.[1] ?? ""
		const argv = argvOf(command)
		expect(argv[0]).toBe("traj")
		const ran = await capture([...argv.slice(1), "--json"], { TRAJ_HOME: home })
		expect(ran.code).toBe(0)
		const after = (await shown(home)).assumed.some((item) => item.kind === "unlabelled-income")
		expect(after).toBe(false)
	})
})
