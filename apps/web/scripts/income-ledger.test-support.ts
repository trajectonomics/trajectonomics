// The scratch ledger the account-income end-to-end test runs against, through the workspace's own traj: a plan worked by
// hand with a salary that stops at a Milestone, a fund and a provident fund, and an editor over it (web ADR 0017).

import { join } from "node:path"
import { type ScenarioDocument, scenarioDocument } from "../src/lib/contract"
import { type EditAnswer, editAnswer } from "../src/lib/edit/answer"
import { type WhatIfAnswer, whatIfAnswer } from "../src/lib/what-if/answer"
import { buildDemoLedger } from "./demo-ledger"
import { BINARY } from "./edit-fixture.test-support"
import { editRequest, PARAMS, TOKEN } from "./edit-request.test-support"
import { recorded } from "./editor-running.test-support"
import { handDocument } from "./income-document.test-support"
import { AS_OF, PLAN, PROVIDENT } from "./income-names.test-support"
import { makeScratch, removeScratch } from "./scratch"
import { createEditor, type Editor } from "./serve-edit"

export { AS_OF, PLAN, PROVIDENT }

const PORT = 4321
let scratch = ""
let home = ""
let editor: Editor | null = null

const env = (): NodeJS.ProcessEnv => ({ ...process.env, TRAJ_HOME: home })

function traj(argv: string[], stdin?: unknown): string {
	const input = stdin === undefined ? undefined : new TextEncoder().encode(JSON.stringify(stdin))
	const run = Bun.spawnSync([BINARY, ...argv], { env: env(), stdin: input })
	if (run.exitCode !== 0) throw new Error(run.stderr.toString() || run.stdout.toString())
	return run.stdout.toString()
}

/** The plan as the ledger holds it. */
export function storedPlan(): { hash: string; document: ScenarioDocument } {
	const shown = JSON.parse(traj(["scenario", "show", "--decimal", "--json", "--", PLAN])) as {
		scenario: { contentHash: string; document: unknown }
	}
	return {
		hash: shown.scenario.contentHash,
		document: scenarioDocument.parse(shown.scenario.document),
	}
}

/** The ledger, the plan and the editor over them. Returns the fund's id, which the Baseline holds. */
export async function setupIncome(): Promise<{ fund: string; bank: string }> {
	scratch = await makeScratch("traj-web-income-")
	home = join(scratch, "traj-home")
	const demo = await buildDemoLedger({ binary: BINARY, home, scratch })
	const base = storedPlan0(demo)
	traj(["scenario", "apply", PLAN, "--file", "-", "--decimal", "--json"], base.document)
	editor = recorded(
		createEditor({
			traj: { binary: BINARY, env: env() },
			cliVersion: "test",
			params: { ...PARAMS, asOf: AS_OF, horizon: "2029-12-31", scenarios: [PLAN], chance: null },
			records: [],
			token: TOKEN,
		}),
	)
	const first = await editor.refresh()
	if (!first.ok) throw new Error(first.error.message)
	return base.ids
}

function storedPlan0(demo: { loan: string }) {
	const shown = JSON.parse(traj(["scenario", "show", "--decimal", "--json", "--", "base"])) as {
		scenario: { document: unknown }
	}
	const base = scenarioDocument.parse(shown.scenario.document)
	const [bank, fund] = base.accounts
	if (bank === undefined || fund === undefined) throw new Error("the demo plan has its accounts")
	const ids = { bank: bank.id, fund: fund.id, loan: demo.loan }
	return { ids, document: handDocument(base, ids) }
}

/** `POST /edit` or `POST /reread`: the answer is the new Snapshot, or the error as data. */
export async function post(route: "edit" | "reread", body: unknown): Promise<EditAnswer> {
	if (editor === null) throw new Error("the editor is not set up")
	const response = await editor[route](editRequest({}, JSON.stringify(body)), PORT)
	return editAnswer.parse(await response.json())
}

/** `POST /what-if`: the four reads of the what-if. */
export async function tryWhatIf(body: unknown): Promise<WhatIfAnswer> {
	if (editor === null) throw new Error("the editor is not set up")
	const response = await editor.whatIf(editRequest({}, JSON.stringify(body)), PORT)
	return whatIfAnswer.parse(await response.json())
}

export async function disposeIncome(): Promise<void> {
	if (scratch !== "") await removeScratch(scratch)
}
