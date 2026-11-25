// The scratch ledger the Estate end-to-end tests run against, through the workspace's own traj: the withdrawals test's
// hand-worked plan (no interest, no inflation, two expenses, a `retire` Milestone on 1 June 2027) with a household of one
// person whose life expectancy falls inside the horizon, and an editor over it (cli ADR 0064, web ADR 0014).

import { join } from "node:path"
import { type ScenarioDocument, scenarioDocument } from "../src/lib/contract"
import { type EditAnswer, editAnswer } from "../src/lib/edit/answer"
import { type WhatIfAnswer, whatIfAnswer } from "../src/lib/what-if/answer"
import { buildDemoLedger } from "./demo-ledger"
import { BINARY } from "./edit-fixture.test-support"
import { editRequest, PARAMS, TOKEN } from "./edit-request.test-support"
import { recorded } from "./editor-running.test-support"
import { makeScratch, removeScratch } from "./scratch"
import { createEditor, type Editor } from "./serve-edit"
import { AS_OF, handDocument } from "./withdrawals-document.test-support"

export { AS_OF }
export const PLAN = "heirs"
/** The household: one holder, born January 1990, who reaches the life expectancy of 38 in 2028. */
export const HOUSEHOLD = {
	schemaVersion: 1,
	people: [{ id: "me", role: "holder", born: "1990-01", lifeExpectancy: 38 }],
	anchors: [],
}
let scratch = ""
let home = ""
let editor: Editor | null = null

function env(): NodeJS.ProcessEnv {
	return { ...process.env, TRAJ_HOME: home }
}

export function traj(argv: string[], stdin?: unknown): string {
	const input = stdin === undefined ? undefined : new TextEncoder().encode(JSON.stringify(stdin))
	const run = Bun.spawnSync([BINARY, ...argv], { env: env(), stdin: input })
	if (run.exitCode !== 0) throw new Error(run.stderr.toString() || run.stdout.toString())
	return run.stdout.toString()
}

/** The plan as the ledger holds it (the estate plan unless a name is given). */
export function storedPlan(name = PLAN): { hash: string; document: ScenarioDocument } {
	const shown = JSON.parse(traj(["scenario", "show", "--decimal", "--json", "--", name])) as {
		scenario: { contentHash: string; document: unknown }
	}
	return {
		hash: shown.scenario.contentHash,
		document: scenarioDocument.parse(shown.scenario.document),
	}
}

/** The ledger's Account ids of the plan: the bank, the fund and the car loan. */
export function accountIds(): { bank: string; fund: string; loan: string } {
	const [bank, fund, loan] = storedPlan().document.accounts
	if (bank === undefined || fund === undefined || loan === undefined)
		throw new Error("the plan has its accounts")
	return { bank: bank.id, fund: fund.id, loan: loan.id }
}

/** Builds the ledger, applies the hand plan and its household, and starts the editor over it. */
export async function setupEstate(): Promise<Editor> {
	scratch = await makeScratch("traj-web-estate-")
	home = join(scratch, "traj-home")
	const demo = await buildDemoLedger({ binary: BINARY, home, scratch })
	const base = scenarioDocument.parse(
		JSON.parse(traj(["scenario", "show", "--decimal", "--json", "--", "base"])).scenario.document,
	)
	const [bank, fund] = base.accounts
	if (bank === undefined || fund === undefined) throw new Error("the demo plan has its accounts")
	// The Demo's plan carries an estate block; this plan starts with none, so a test adds the lines itself.
	const { estate: _estate, ...hand } = handDocument(base, {
		bank: bank.id,
		fund: fund.id,
		loan: demo.loan,
	})
	const document = hand
	traj(["scenario", "apply", PLAN, "--file", "-", "--decimal", "--json"], document)
	traj(["scenario", "household", PLAN, "--file", "-", "--json"], HOUSEHOLD)
	const next = createEditor({
		traj: { binary: BINARY, env: env() },
		cliVersion: "test",
		params: { ...PARAMS, asOf: AS_OF, horizon: "2030-12-31", scenarios: [PLAN] },
		records: [],
		token: TOKEN,
	})
	const first = await next.refresh()
	if (!first.ok) throw new Error(first.error.message)
	editor = recorded(next)
	return editor
}

function editorOf(): Editor {
	if (editor === null) throw new Error("the editor is not set up")
	return editor
}

/** `POST /edit` or `POST /reread`: the answer is the new Snapshot, or the error as data. */
export async function post(route: "edit" | "reread", body: unknown): Promise<EditAnswer> {
	const response = await editorOf()[route](editRequest({}, JSON.stringify(body)), 4321)
	return editAnswer.parse(await response.json())
}

/** `POST /what-if`: the four reads of the what-if. */
export async function tryWhatIf(body: unknown): Promise<WhatIfAnswer> {
	const response = await editorOf().whatIf(editRequest({}, JSON.stringify(body)), 4321)
	return whatIfAnswer.parse(await response.json())
}

export async function disposeEstate(): Promise<void> {
	if (scratch !== "") await removeScratch(scratch)
}
