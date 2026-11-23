// The scratch ledger the allowances end-to-end test runs against, through the workspace's own traj: a taxed plan
// worked by hand for the 2027 tax year, and an editor over it, with the page's requests as functions.
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { type ScenarioDocument, scenarioDocument } from "../src/lib/contract"
import { buildDemoLedger } from "./demo-ledger"
import { BINARY } from "./edit-fixture.test-support"
import { PARAMS, TOKEN } from "./edit-request.test-support"
import { createEditor, type Editor } from "./serve-edit"

export const PLAN = "hand"
const AS_OF = "2027-01-01"
let scratch = ""
let home = ""
let editor: Editor | null = null

/** The editor over the scratch ledger. */
export function editorOf(): Editor {
	if (editor === null) throw new Error("the editor is not set up")
	return editor
}

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

/**
 * Hand-worked 2027: a salary of 50,000.00 a month is 600,000.00; the Levy takes 100,000.00 of it as expenses and
 * 60,000.00 as the personal allowance, and 12,000.00 a year goes into RMF. Taxable 428,000.00, so the tax is
 * 7,500.00 on 150,000.00 to 300,000.00 and 12,800.00 on the 128,000.00 above it: 20,300.00. RMF may take 30% of
 * 600,000.00 (180,000.00), so 168,000.00 more brings the taxable income to 260,000.00 and the tax to 5,500.00.
 */
export async function setupAllowances(): Promise<Editor> {
	scratch = await mkdtemp(join(tmpdir(), "traj-web-allowances-"))
	home = join(scratch, "traj-home")
	await buildDemoLedger({ binary: BINARY, home, scratch })
	const base = storedPlan("base").document
	const [bank, fund] = base.accounts
	if (bank === undefined || fund === undefined) throw new Error("the demo plan has its accounts")
	const document = {
		...base,
		accounts: base.accounts.filter(
			(account) => account.id !== "condo" && account.id !== "condo-loan",
		),
		economy: { inflation: 0 },
		cashflow: { surplus: [{ account: bank.id }], contribute: [fund.id], withdraw: [bank.id] },
		flows: [
			{
				id: "salary",
				kind: "income",
				earned: true,
				frequency: "monthly",
				start: AS_OF,
				end: "2027-12-31",
				amount: "50000.00",
				growth: { bps: 0 },
			},
			{
				id: "rmf",
				kind: "contribution",
				target: fund.id,
				frequency: "monthly",
				start: AS_OF,
				end: "2027-12-31",
				amount: "1000.00",
				growth: { bps: 0 },
			},
		],
	}
	delete (document as { milestones?: unknown }).milestones
	traj(["scenario", "apply", PLAN, "--file", "-", "--decimal", "--json"], document)
	traj([
		"scenario",
		"tax",
		PLAN,
		"--tax",
		"th-2026",
		"--label",
		"salary=income.section40_1",
		"--label",
		"rmf=allowance.retirement.rmf",
	])
	editor = createEditor({
		traj: { binary: BINARY, env: env() },
		cliVersion: "test",
		params: { ...PARAMS, asOf: AS_OF, horizon: "2027-12-31", scenarios: [PLAN] },
		records: [],
		token: TOKEN,
	})
	const first = await editor.refresh()
	if (!first.ok) throw new Error(first.error.message)
	return editor
}

export async function disposeAllowances(): Promise<void> {
	if (scratch !== "") await rm(scratch, { recursive: true, force: true })
}
