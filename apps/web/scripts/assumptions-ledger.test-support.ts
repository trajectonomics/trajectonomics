// The scratch ledger the Assumptions end-to-end tests run against, through the workspace's own traj: the withdrawals test's
// hand-worked plan (a bank, a fund and a car loan, inflation stated as 0) with no volatility and no chance inputs, and an
// editor over it whose every traj call is logged (cli ADR 0068, web ADR 0018).
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { type ScenarioDocument, scenarioDocument } from "../src/lib/contract"
import { type EditAnswer, editAnswer } from "../src/lib/edit/answer"
import { type WhatIfAnswer, whatIfAnswer } from "../src/lib/what-if/answer"
import { spyContext } from "./allowances-spy.test-support"
import { buildDemoLedger } from "./demo-ledger"
import { BINARY } from "./edit-fixture.test-support"
import { editRequest, PARAMS, TOKEN } from "./edit-request.test-support"
import { recorded } from "./editor-running.test-support"
import { createEditor, type Editor } from "./serve-edit"
import { AS_OF, handDocument } from "./withdrawals-document.test-support"

export const PLAN = "swing"
/** The seed and paths a person types, and the horizon the plan is read to. */
export const SEED = "0123456789abcdef"
export const PATHS = 300
let scratch = ""
let home = ""
let editor: Editor | null = null
let spy: Awaited<ReturnType<typeof spyContext>> | null = null

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
export function storedPlan(): { hash: string; document: ScenarioDocument } {
	const shown = JSON.parse(traj(["scenario", "show", "--decimal", "--json", "--", PLAN])) as {
		scenario: { contentHash: string; document: unknown }
	}
	return {
		hash: shown.scenario.contentHash,
		document: scenarioDocument.parse(shown.scenario.document),
	}
}

/** Builds the ledger, applies the plan, and starts the editor, with the chance reads off until a test states them. */
export async function setupAssumptions(): Promise<Editor> {
	scratch = await mkdtemp(join(tmpdir(), "traj-web-assumptions-"))
	home = join(scratch, "traj-home")
	const demo = await buildDemoLedger({ binary: BINARY, home, scratch })
	const base = scenarioDocument.parse(
		JSON.parse(traj(["scenario", "show", "--decimal", "--json", "--", "base"])).scenario.document,
	)
	const [bank, fund] = base.accounts
	if (bank === undefined || fund === undefined) throw new Error("the demo plan has its accounts")
	traj(
		["scenario", "apply", PLAN, "--file", "-", "--decimal", "--json"],
		handDocument(base, { bank: bank.id, fund: fund.id, loan: demo.loan }),
	)
	spy = await spyContext(env())
	return startEditor(false)
}

/** A new editor over the same ledger, with the five paths read in advance or not (the offline Snapshot reads them, a live dashboard does not). */
export async function startEditor(readPaths: boolean): Promise<Editor> {
	if (spy === null) throw new Error("the ledger is not set up")
	editor = recorded(
		createEditor({
			traj: spy.context,
			cliVersion: "test",
			params: { ...PARAMS, asOf: AS_OF, horizon: "2030-12-31", scenarios: [PLAN], readPaths },
			records: [],
			token: TOKEN,
		}),
	)
	const first = await editor.refresh()
	if (!first.ok) throw new Error(first.error.message)
	return editor
}

/** The log of every traj call the editor made. */
export function logOf(): string {
	if (spy === null) throw new Error("the editor is not set up")
	return spy.log
}

/** The ids of the bank and the fund, in the plan's order. */
export function ids(): { bank: string; fund: string } {
	const [bank, fund] = storedPlan().document.accounts
	if (bank === undefined || fund === undefined) throw new Error("the plan has its accounts")
	return { bank: bank.id, fund: fund.id }
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

export async function disposeAssumptions(): Promise<void> {
	if (spy !== null) await spy.dispose()
	if (scratch !== "") await rm(scratch, { recursive: true, force: true })
}

/** `traj <argv>` on the scratch ledger, as someone at a terminal would run it. */
export function terminal(argv: string[], stdin?: unknown): string {
	return traj(argv, stdin)
}
