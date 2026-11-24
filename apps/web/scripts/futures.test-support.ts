// The ledger the futures end-to-end tests run against, through the workspace's own traj: the demo's `retire-early` plan
// read through the demo's Return model, and an editor over it (web ADR 0020).
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { render } from "svelte/server"
import PathView from "../src/components/chance/path/PathView.svelte"
import type { ProjectionChance, Snapshot } from "../src/lib/contract"
import type { PlanParams } from "../src/lib/snapshot"
import { pathAnswer } from "../src/lib/snapshot/paths"
import { demoCarryIn } from "./demo/carry-in"
import { DEMO_PATHS, DEMO_SEED, demoReturnModel } from "./demo/return-model"
import { buildDemoLedger } from "./demo-ledger"
import { BINARY } from "./edit-fixture.test-support"
import { editRequest, PARAMS, TOKEN } from "./edit-request.test-support"
import { createEditor, type Editor } from "./serve-edit"
import { answerPath } from "./serve-path"

export const PLAN = "retire-early"
let scratch = ""
let editor: Editor | null = null
let snapshot: Snapshot | null = null
let traj: { binary: string; env: NodeJS.ProcessEnv } | null = null
let params: PlanParams | null = null

/** Builds the ledger and reads the Snapshot once. */
export async function setupFutures(): Promise<void> {
	scratch = await mkdtemp(join(tmpdir(), "traj-web-futures-"))
	const home = join(scratch, "traj-home")
	const ids = await buildDemoLedger({ binary: BINARY, home, scratch })
	const model = join(scratch, "return-model.json")
	await writeFile(model, JSON.stringify(demoReturnModel(ids)))
	traj = { binary: BINARY, env: { ...process.env, TRAJ_HOME: home } }
	params = {
		...PARAMS,
		readPaths: true,
		horizon: "2053-12-31",
		scenarios: [PLAN],
		carryIn: true,
		chance: { returnModel: model, paths: DEMO_PATHS, seed: DEMO_SEED },
	}
	editor = createEditor({
		traj,
		cliVersion: "test",
		params,
		records: demoCarryIn([PLAN]),
		token: TOKEN,
	})
	const run = await editor.refresh()
	if (!run.ok) throw new Error(run.error.message)
	snapshot = run.snapshot
}

export async function disposeFutures(): Promise<void> {
	if (scratch !== "") await rm(scratch, { recursive: true, force: true })
}

function held<T>(value: T | null): T {
	if (value === null) throw new Error("the futures ledger is not set up")
	return value
}

export const snapshotOf = (): Snapshot => held(snapshot)
export const editorOf = (): Editor => held(editor)
export const paramsOf = (): PlanParams => held(params)
export const trajOf = () => held(traj)

/** The chance read of the plan. */
export function chanceOf(): ProjectionChance {
	const read = snapshotOf().reads.chance[PLAN]
	if (read?.ok !== true) throw new Error("the chance read failed")
	return read.data
}

/** One `POST /reread` with a path, as the page sends it: the status and the parsed answer. */
export async function readPath(body: unknown, change: Record<string, string | null> = {}) {
	const request = editRequest(change, JSON.stringify(body))
	const response = await editorOf().reread(request, 4321)
	return { status: response.status, answer: pathAnswer.parse(await response.json()) }
}

/** The path page for one index, over the Snapshot. */
export function page(index: number): string {
	return render(PathView, {
		props: {
			snapshot: snapshotOf(),
			scenario: PLAN,
			index: String(index),
			terms: "both",
			onTerms: () => {},
		},
	}).body
}

/** `answerPath` over a held Snapshot with the chance parameters changed: the refusals come before any traj run, so none runs. */
export async function answerChanged(
	snapshot: Snapshot,
	index: number,
	change: { paths?: number; seed?: string },
) {
	const chance = held(params).chance
	if (chance === null) throw new Error("the futures ledger states a chance")
	const response = await answerPath(
		{ plan: PLAN, index },
		{ ...held(params), chance: { ...chance, ...change } },
		snapshot,
		{ binary: "/nonexistent/traj", env: {} },
		[],
	)
	return { status: response.status, answer: pathAnswer.parse(await response.json()) }
}
