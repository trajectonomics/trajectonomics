import type { AllowancesView } from "./projection/allowances-view"
import { taxedHome } from "./projection/carry-in-support"
import { applyScenario, scenario } from "./scenario-test-support"
import { type Captured, capture } from "./test-support"

/** The labels the Thai Levy `scenario tax` writes reads for the two allowances the tests fill. */
export const RMF = "allowance.retirement.rmf"
export const ESG = "allowance.thai_esg"

/** The dates that make 2026 and 2027 whole tax years the Projection holds, with 2025 closed by the scope record. */
export const YEARS: readonly string[] = ["--as-of", "2026-01-01", "--horizon", "2027-12-31"]

/** One Scenario document as the store holds it, read back by name. */
export async function documentOf(home: string, name: string): Promise<Record<string, unknown>> {
	const shown = await scenario(home, ["show", name])
	if (shown.code !== 0) throw new Error(shown.err)
	return (JSON.parse(shown.out) as { scenario: { document: Record<string, unknown> } }).scenario
		.document
}

/**
 * The taxed example with an RMF contribution into a fund and a ThaiESG Account: `plan` is the base
 * plan with the Thai Levy, RMF at 5,000 a month into `rmf-fund`, and ThaiESG at 1,000 a month into `esg-fund`.
 */
export async function allowancesHome(): Promise<string> {
	const home = await taxedHome()
	const document = await documentOf(home, "base")
	const flow = (id: string, target: string, label: string, amount: number) => ({
		id,
		kind: "contribution",
		target,
		label,
		amount,
		frequency: "monthly",
		start: "2026-04-01",
		growth: { bps: 0 },
	})
	const accounts = document["accounts"] as unknown[]
	const flows = document["flows"] as unknown[]
	const cashflow = document["cashflow"] as { contribute: string[] }
	const plan = {
		...document,
		accounts: [
			...accounts,
			{ id: "rmf-fund", kind: "asset", rate: 0 },
			{ id: "esg-fund", kind: "asset", rate: 0 },
		],
		flows: [
			...flows,
			flow("rmf-monthly", "rmf-fund", RMF, 500_000),
			flow("esg-monthly", "esg-fund", ESG, 100_000),
		],
		cashflow: { ...cashflow, contribute: [...cashflow.contribute, "rmf-fund", "esg-fund"] },
	}
	const applied = await applyScenario(home, "plan", plan)
	if (applied.code !== 0) throw new Error(applied.err)
	return home
}

/** Runs `traj projection allowances ... --json` against one data directory. */
export function allowances(home: string, argv: readonly string[]): Promise<Captured> {
	return capture(["projection", "allowances", ...argv, "--json"], { TRAJ_HOME: home })
}

/** The flags every happy-path test shares: the plan, the two years, RMF then ThaiESG, and a step. */
export function planFlags(step = "10000", scenarioName = "plan"): string[] {
	return ["--scenario", scenarioName, ...YEARS, "--labels", `${RMF},${ESG}`, "--step", step]
}

/** A successful result, parsed. */
export function bodyOf(res: Captured): AllowancesView {
	if (res.code !== 0) throw new Error(res.err)
	return JSON.parse(res.out) as AllowancesView
}

/** A failed result's error object. */
export function errorOf(res: Captured): {
	code: string
	path?: string
	message: string
	hint?: string
	details?: unknown
} {
	return (JSON.parse(res.err) as { error: ReturnType<typeof errorOf> }).error
}

/** The plan's flags with one flag's value replaced, or added when the plan does not give it. */
export function withFlag(flag: string, value: string): string[] {
	const flags = planFlags()
	const at = flags.indexOf(flag)
	if (at === -1) return [...flags, flag, value]
	flags[at + 1] = value
	return flags
}
