// Helpers for the tests of the tax profile `scenario tax` keeps (cli ADR-0066).
import { expect } from "bun:test"
import { projectionHome } from "./projection/testing"
import { resultOf, scenario } from "./scenario-test-support"
import type { Captured } from "./test-support"

export const SALARY: readonly string[] = ["--label", "salary=income.section40_1"]

/** `traj scenario tax ...` in JSON against one data directory. */
export function tax(home: string, argv: readonly string[]): Promise<Captured> {
	return scenario(home, ["tax", ...argv])
}

export type Shown = {
	contentHash: string
	version: number
	document: { levies?: unknown[] }
	tax: Record<string, unknown> | null
	taxed: boolean
}

export async function shown(home: string, name = "base"): Promise<Shown> {
	const res = await scenario(home, ["show", name])
	expect(res.code).toBe(0)
	return resultOf(res).scenario as Shown
}

/** A home whose `base` is taxed under a profile with a child and a mortgage. */
export async function taxedHome(): Promise<string> {
	const home = await projectionHome()
	const res = await tax(home, [
		"base",
		"--tax",
		"th-2026",
		"--filing-status",
		"married_joint",
		"--children",
		"1",
		"--mortgage-interest",
		"30000",
		...SALARY,
	])
	expect(res.code).toBe(0)
	return home
}
