// The scratch ledger the loan end-to-end tests write to, through the workspace's own traj binary: helpers to
// read a plan, send an Edit as the planner does, and read the plan's projection back from the answer.
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
	type Baseline,
	baseline,
	type ProjectionRun,
	type Read,
	type ScenarioDocument,
	scenarioDocument,
	snapshot,
} from "../src/lib/contract"
import { demoCarryIn } from "./demo/carry-in"
import { buildDemoLedger } from "./demo-ledger"
import { BINARY, SLOW_MS } from "./edit-fixture.test-support"
import { editRequest, PARAMS, TOKEN } from "./edit-request.test-support"
import { track } from "./editor-running.test-support"
import { createEditor, type Editor } from "./serve-edit"

export { SLOW_MS }

export type Answer = {
	ok: boolean
	snapshot?: unknown
	error?: { code: string; message: string; path?: string }
}

let scratch = ""
let home = ""
let editor: Editor | null = null

export function env(): NodeJS.ProcessEnv {
	return { ...process.env, TRAJ_HOME: home }
}

/** `traj scenario apply` on the scratch ledger, as a person at a terminal runs it. */
export function applyInTerminal(name: string, document: unknown): void {
	const run = Bun.spawnSync(
		[BINARY, "scenario", "apply", name, "--file", "-", "--decimal", "--json"],
		{ env: env(), stdin: new TextEncoder().encode(JSON.stringify(document)) },
	)
	if (run.exitCode !== 0) throw new Error(run.stderr.toString() || run.stdout.toString())
}

export function showOf(name: string): { scenario: { contentHash: string; document: unknown } } {
	const run = Bun.spawnSync([BINARY, "scenario", "show", "--decimal", "--json", "--", name], {
		env: env(),
	})
	if (run.exitCode !== 0) throw new Error(run.stderr.toString())
	return JSON.parse(run.stdout.toString())
}

export function documentOf(name: string): ScenarioDocument {
	return scenarioDocument.parse(showOf(name).scenario.document)
}

export function hashOf(name: string): string {
	return showOf(name).scenario.contentHash
}

/** The Baseline as the Snapshot reads it, in the form the page holds it. */
export function baselineOf(): Read<Baseline> {
	const run = Bun.spawnSync([BINARY, "baseline", "show", "--as-of", PARAMS.asOf, "--json"], {
		env: env(),
	})
	if (run.exitCode !== 0) throw new Error(run.stderr.toString())
	return { argv: [], ok: true, data: baseline.parse(JSON.parse(run.stdout.toString())) }
}

export function editor_(): Editor {
	if (editor === null) throw new Error("the editor is not set up")
	return editor
}

/** Sends one Edit, as the planner does, and returns the answer. */
export function send(body: Record<string, unknown>): Promise<Answer> {
	return track(
		editor_()
			.edit(editRequest({}, JSON.stringify(body)), 4321)
			.then((response) => response.json() as Promise<Answer>),
	)
}

/** An apply-plan Edit of the document over the plan as the ledger holds it now. */
export function save(name: string, document: ScenarioDocument, contentHash = hashOf(name)) {
	return send({ kind: "apply-plan", name, contentHash, document })
}

/** The plan's projection run from an Edit's answer; fails the test when the plan did not project. */
export function runOf(answer: Answer, name: string): ProjectionRun {
	if (!answer.ok || answer.snapshot === undefined)
		throw new Error(answer.error?.message ?? "no run")
	const read = snapshot.parse(answer.snapshot).reads.projections[name]
	if (read === undefined || !read.ok)
		throw new Error(read?.ok === false ? read.error.message : "no projection")
	return read.data
}

/** Builds the demo ledger in a scratch directory, with each plan a copy of `base`, and an editor over it. */
export async function setupLedger(plans: string[]): Promise<void> {
	scratch = await mkdtemp(join(tmpdir(), "traj-web-loans-fixes-"))
	home = join(scratch, "traj-home")
	await buildDemoLedger({ binary: BINARY, home, scratch })
	for (const name of plans) applyInTerminal(name, documentOf("base"))
	editor = createEditor({
		traj: { binary: BINARY, env: env() },
		cliVersion: "test",
		params: { ...PARAMS, scenarios: plans, carryIn: true },
		records: demoCarryIn(plans),
		token: TOKEN,
	})
	await editor_().refresh()
}

/** Removes the scratch ledger. */
export async function disposeLedger(): Promise<void> {
	if (scratch !== "") await rm(scratch, { recursive: true, force: true })
}
