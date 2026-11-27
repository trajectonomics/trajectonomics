// The chance of success from the plan's own return model, against the real traj (cli ADR-0068). `traj dashboard`
// turns --paths and --seed into `--return-model plan`, so the Dashboard's chance read is `projection chance
// --return-model plan`, whose result carries a `returnModel` echo. The contract is a closed shape, so a field it does
// not name fails the read as `contract_mismatch`; this test keeps that from recurring unseen.
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test"

import { join } from "node:path"
import { DEMO_PATHS, DEMO_SEED } from "./demo/return-model"
import { copyDemoLedger } from "./demo-ledger.test-support"
import { BINARY, SLOW_MS } from "./edit-fixture.test-support"
import { PARAMS, TOKEN } from "./edit-request.test-support"
import { recorded, settle } from "./editor-running.test-support"
import { makeScratch, removeScratch } from "./scratch"
import { createEditor, type Editor } from "./serve-edit"
import { AS_OF, handDocument } from "./withdrawals-document.test-support"

const PLAN = "swing"
const VOLATILITY = 1500
let scratch = ""
let home = ""
let editor: Editor | null = null

function traj(argv: string[], stdin?: unknown): string {
	const input = stdin === undefined ? undefined : new TextEncoder().encode(JSON.stringify(stdin))
	const run = Bun.spawnSync([BINARY, ...argv], {
		env: { ...process.env, TRAJ_HOME: home },
		stdin: input,
	})
	if (run.exitCode !== 0) throw new Error(run.stderr.toString() || run.stdout.toString())
	return run.stdout.toString()
}

/** The editor over a ledger whose plan gives its fund a volatility, asked for the chance as `traj dashboard` asks. */
async function setup(): Promise<Editor> {
	scratch = await makeScratch("traj-web-chance-plan-")
	home = join(scratch, "traj-home")
	const demo = await copyDemoLedger({ binary: BINARY, home, scratch })
	const shown = JSON.parse(traj(["scenario", "show", "--decimal", "--json", "--", "base"])) as {
		scenario: { document: Parameters<typeof handDocument>[0] }
	}
	const base = shown.scenario.document
	const [bank, fund] = base.accounts
	if (bank === undefined || fund === undefined) throw new Error("the demo plan has its accounts")
	const document = handDocument(base, { bank: bank.id, fund: fund.id, loan: demo.loan })
	const swinging = {
		...document,
		accounts: document.accounts.map((account) =>
			account.id === fund.id ? { ...account, volatility: VOLATILITY } : account,
		),
	}
	traj(["scenario", "apply", PLAN, "--file", "-", "--decimal", "--json"], swinging)
	return recorded(
		createEditor({
			traj: { binary: BINARY, env: { ...process.env, TRAJ_HOME: home } },
			cliVersion: "test",
			params: {
				...PARAMS,
				asOf: AS_OF,
				horizon: "2030-12-31",
				scenarios: [PLAN],
				chance: { returnModel: "plan", paths: DEMO_PATHS, seed: DEMO_SEED },
			},
			records: [],
			token: TOKEN,
		}),
	)
}

beforeAll(async () => {
	editor = await setup()
}, SLOW_MS)
afterAll(async () => {
	if (scratch !== "") await removeScratch(scratch)
})
afterEach(settle, SLOW_MS)

describe("the Dashboard's chance read with --paths and --seed on a volatile plan", () => {
	test(
		"is ok, and states the plan's own model it was built from",
		async () => {
			const run = await editor?.refresh()
			if (run === undefined || !run.ok)
				throw new Error(run?.ok === false ? run.error.message : "no editor")
			const chance = run.snapshot.reads.chance[PLAN]
			if (chance === undefined) throw new Error("no chance read")
			expect(chance.ok).toBe(true)
			if (!chance.ok) return
			expect(chance.argv).toContain("--return-model=plan")
			expect(chance.data.paths).toBe(DEMO_PATHS)
			expect(chance.data.returnModel).toMatchObject({ source: "plan", buckets: 256 })
			expect(chance.data.returnModel?.accounts.map((account) => account.volatility)).toEqual([
				VOLATILITY,
			])
		},
		SLOW_MS,
	)
})
