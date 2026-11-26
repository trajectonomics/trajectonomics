import { describe, expect, it } from "bun:test"
import { couple, coupleHousehold, TWO_SALARIES, taxCouple } from "./scenario-tax-filers-support"
import { LABELS, year2026 } from "./scenario-tax-separate-support"
import { resultOf, scenario } from "./scenario-test-support"

/* Following the caveat's whole command restores the tax a bare merge displaced (cli ADR-0075). */

const tax = (home: string, ...flags: string[]) => scenario(home, ["tax", "base", ...flags])
const owed = async (home: string) =>
	Object.fromEntries((await year2026(home)).map((it) => [it.filer, it.due]))

/** The couple filing separately with these claims, their figures, then a joint Return over them. */
async function joint(
	claims: readonly string[],
): Promise<{ home: string; original: Record<string, string> }> {
	const home = await couple(TWO_SALARIES, coupleHousehold())
	expect((await taxCouple(home, "married_separate", LABELS, claims)).code).toBe(0)
	const original = await owed(home)
	expect((await tax(home, "--merge", "--filing-status", "married_joint")).code).toBe(0)
	return { home, original }
}

/** The caveat's own command, with the holder's real values put in its placeholders. */
function printed(sentence: string, mine: Readonly<Record<string, string>>): string[] {
	const command = /for example (--filing-status married_separate .+) --merge\.$/.exec(sentence)?.[1]
	expect(command).toBeDefined()
	const filled = command!.replace(
		/--([a-z-]+) ([a-z]+)=<(?:n|amount)>/g,
		(_all, flag: string, person: string) => `--${flag} ${person}=${mine[flag]}`,
	)
	expect(filled).not.toContain("<")
	return [...filled.split(" "), "--merge"]
}

describe("the caveat's switch-back command with a claim in every field", () => {
	it("restores parents and life insurance (case A)", async () => {
		const { home, original } = await joint([
			"--parents",
			"partner=2",
			"--life-insurance",
			"partner=80000",
		])
		expect(original).toEqual({ me: "83000.00", partner: "2500.00" })
		const bare = await tax(home, "--merge", "--parents", "2", "--life-insurance", "80000")
		expect(bare.code, bare.err).toBe(0)
		const [sentence] = resultOf(bare).unclaimed as string[]
		expect(sentence).toContain(
			"for example --filing-status married_separate --parents me=<n> --life-insurance me=<amount> --merge.",
		)
		const res = await tax(home, ...printed(sentence!, { parents: "0", "life-insurance": "0" }))
		expect(res.code, res.err).toBe(0)
		expect(await owed(home)).toEqual(original)
	})

	it("restores life insurance and mortgage interest", async () => {
		const { home, original } = await joint([
			"--life-insurance",
			"partner=80000",
			"--mortgage-interest",
			"partner=50000",
		])
		expect(original).toEqual({ me: "83000.00", partner: "3000.00" })
		const bare = await tax(
			home,
			"--merge",
			"--life-insurance",
			"80000",
			"--mortgage-interest",
			"50000",
		)
		expect(bare.code, bare.err).toBe(0)
		const [sentence] = resultOf(bare).unclaimed as string[]
		expect(sentence).toContain(
			"for example --filing-status married_separate --life-insurance me=<amount> --mortgage-interest me=<amount> --merge.",
		)
		const back = printed(sentence!, { "life-insurance": "0", "mortgage-interest": "0" })
		expect((await tax(home, ...back)).code).toBe(0)
		expect(await owed(home)).toEqual(original)
	})

	it("restores children at both rates (case B)", async () => {
		const { home, original } = await joint([
			"--children",
			"partner=1",
			"--children-at-higher-rate",
			"partner=1",
		])
		expect(original).toEqual({ me: "83000.00", partner: "8500.00" })
		const bare = await tax(home, "--merge", "--children", "1", "--children-at-higher-rate", "1")
		expect(bare.code, bare.err).toBe(0)
		const [sentence] = resultOf(bare).unclaimed as string[]
		expect(sentence).toContain(
			"for example --filing-status married_separate --children me=<n> --children-at-higher-rate me=<n> --merge.",
		)
		const back = printed(sentence!, { children: "0", "children-at-higher-rate": "0" })
		expect((await tax(home, ...back)).code).toBe(0)
		expect(await owed(home)).toEqual(original)
	})

	it("restores children and parents within the separate cap (case C)", async () => {
		const { home, original } = await joint([
			"--parents",
			"me=1",
			"--children",
			"partner=1",
			"--parents",
			"partner=2",
		])
		expect(original).toEqual({ me: "77000.00", partner: "5000.00" })
		const bare = await tax(home, "--merge", "--children", "1", "--parents", "3")
		expect(bare.code, bare.err).toBe(0)
		const [sentence] = resultOf(bare).unclaimed as string[]
		expect(sentence).toContain(
			"for example --filing-status married_separate --children me=<n> --parents me=<n> --merge.",
		)
		const back = printed(sentence!, { children: "0", parents: "1" })
		expect((await tax(home, ...back)).code).toBe(0)
		expect(await owed(home)).toEqual(original)
	})
})
