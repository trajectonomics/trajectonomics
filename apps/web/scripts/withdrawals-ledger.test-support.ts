// The scratch ledger the withdrawals end-to-end test runs against, through the workspace's own traj: a plan with two
// expenses and a retirement Milestone, worked by hand, and an editor over it with a Return model, so the chance read
// states the spending Bands (cli ADR 0063).
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { type ScenarioDocument, scenarioDocument } from "../src/lib/contract"
import { DEMO_PATHS, DEMO_SEED, demoReturnModel } from "./demo/return-model"
import { copyDemoLedger } from "./demo-ledger.test-support"
import { BINARY } from "./edit-fixture.test-support"
import { PARAMS, TOKEN } from "./edit-request.test-support"
import { AS_OF, handDocument } from "./withdrawals-document.test-support"

export { AS_OF }

import { recorded } from "./editor-running.test-support"
import { makeScratch, removeScratch } from "./scratch"
import { createEditor, type Editor } from "./serve-edit"

export const PLAN = "spend"
let scratch = ""
let home = ""
let editor: Editor | null = null

function env(): NodeJS.ProcessEnv {
	return { ...process.env, TRAJ_HOME: home }
}

function traj(argv: string[], stdin?: unknown): string {
	const input = stdin === undefined ? undefined : new TextEncoder().encode(JSON.stringify(stdin))
	const run = Bun.spawnSync([BINARY, ...argv], { env: env(), stdin: input })
	if (run.exitCode !== 0) throw new Error(run.stderr.toString() || run.stdout.toString())
	return run.stdout.toString()
}

/** The plan as the ledger holds it. */
export function storedPlan(name = PLAN): { hash: string; document: ScenarioDocument } {
	const shown = JSON.parse(traj(["scenario", "show", "--decimal", "--json", "--", name])) as {
		scenario: { contentHash: string; document: unknown }
	}
	return {
		hash: shown.scenario.contentHash,
		document: scenarioDocument.parse(shown.scenario.document),
	}
}

/** The Account ids the plan declares. */
export function accountIds(): { bank: string; fund: string } {
	const [bank, fund] = storedPlan().document.accounts
	if (bank === undefined || fund === undefined) throw new Error("the plan has its accounts")
	return { bank: bank.id, fund: fund.id }
}

/**
 * The plan: rent of 1,000.00 a month from January to May 2027 and a gym of 100.00 a month with no end, no growth and
 * no interest, so the savings on 1 June 2027, when `retire` fires, are what the Baseline holds less 5,000.00 and
 * 500.00 (the gym's five payments, which a stop at `retire` would end).
 */
export async function setupWithdrawals(): Promise<Editor> {
	scratch = await makeScratch("traj-web-withdrawals-")
	home = join(scratch, "traj-home")
	const demo = await copyDemoLedger({ binary: BINARY, home, scratch })
	const base = storedPlan("base").document
	const [bank, fund] = base.accounts
	if (bank === undefined || fund === undefined) throw new Error("the demo plan has its accounts")
	const document = handDocument(base, { bank: bank.id, fund: fund.id, loan: demo.loan })
	traj(["scenario", "apply", PLAN, "--file", "-", "--decimal", "--json"], document)
	const model = join(home, "return-model.json")
	await writeFile(
		model,
		JSON.stringify(demoReturnModel({ bank: bank.id, fund: fund.id, loan: demo.loan })),
	)
	editor = recorded(
		createEditor({
			traj: { binary: BINARY, env: env() },
			cliVersion: "test",
			params: {
				...PARAMS,
				asOf: AS_OF,
				horizon: "2030-12-31",
				scenarios: [PLAN],
				chance: { returnModel: model, paths: DEMO_PATHS, seed: DEMO_SEED },
			},
			records: [],
			token: TOKEN,
		}),
	)
	const first = await editor.refresh()
	if (!first.ok) throw new Error(first.error.message)
	return editor
}

/** The editor over the scratch ledger. */
export function editorOf(): Editor {
	if (editor === null) throw new Error("the editor is not set up")
	return editor
}

export async function disposeWithdrawals(): Promise<void> {
	if (scratch !== "") await removeScratch(scratch)
}
