// Setup for the #860 follow-ups: a taxed couple plan with only the holder's salary labelled, the
// extra unlabelled Flows, and a shell that pastes a printed hint the way a person would.
import { expect } from "bun:test"
import { join } from "node:path"
import type { Owner } from "./scenario/household/model"
import { setHousehold } from "./scenario-household-support"
import {
	COUPLE_OWNERS,
	COUPLE_PLAN,
	couple,
	coupleHousehold,
	taxCouple,
} from "./scenario-tax-filers-support"
import { applyScenario, resultOf, scenario } from "./scenario-test-support"

export type AssumedItem = { kind: string; path: string; hint: string | null }

export type Shown = {
	document: Record<string, unknown> & {
		flows: Record<string, unknown>[]
		levies: Record<string, unknown>[]
	}
	tax: Record<string, unknown> | null
	assumed: AssumedItem[]
}

/** What `scenario show` states for `base`. */
export async function read(home: string): Promise<Shown> {
	const res = await scenario(home, ["show", "base"])
	expect(res.code).toBe(0)
	return resultOf(res).scenario as Shown
}

/** The unlabelled-income items the plan states. */
export function unlabelled(shown: Shown): AssumedItem[] {
	return shown.assumed.filter((item) => item.kind === "unlabelled-income")
}

/** The command a `Run "..."` hint prints. */
export function commandOf(hint: string | null): string {
	return hint?.match(/^Run "(traj .+?)" (?:for a salary|to write)/)?.[1] ?? ""
}

/**
 * A home whose `base` is a couple plan taxed over the holder's salary only, with the partner's
 * salary absent, then `ids` added unlabelled and `owners` set (cli ADR-0075, ADR-0083).
 */
export async function meOnly(
	ids: readonly string[],
	owners: readonly Owner[] = COUPLE_OWNERS ?? [],
): Promise<string> {
	const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
	const start = await read(home)
	const flows = start.document.flows.filter((flow) => flow["id"] !== "partner-salary")
	expect((await applyScenario(home, "base", { ...start.document, flows })).code).toBe(0)
	expect(
		(await taxCouple(home, "married_joint", ["--label", "salary=income.section40_1"])).code,
	).toBe(0)
	const taxed = await read(home)
	const salary = taxed.document.flows.find((flow) => flow["id"] === "salary") ?? {}
	const { label: _label, ...bare } = salary
	const added = ids.map((id) => ({ ...bare, id }))
	expect(
		(
			await applyScenario(home, "base", {
				...taxed.document,
				flows: [...taxed.document.flows, ...added],
			})
		).code,
	).toBe(0)
	expect((await setHousehold(home, coupleHousehold([...owners]))).code).toBe(0)
	return home
}

/** Runs a printed command through `sh`, with this checkout's CLI and the scratch home. */
export async function runAsPrinted(
	home: string,
	command: string,
): Promise<{ code: number; err: string }> {
	const entry = join(import.meta.dir, "index.ts")
	const proc = Bun.spawn(
		["sh", "-c", command.replace(/^traj\b/, `'${process.execPath}' '${entry}'`)],
		{
			env: { ...process.env, TRAJ_HOME: home, DO_NOT_TRACK: "1" },
			stdout: "pipe",
			stderr: "pipe",
		},
	)
	const [err, code] = await Promise.all([new Response(proc.stderr).text(), proc.exited])
	return { code, err }
}
