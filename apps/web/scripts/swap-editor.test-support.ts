// The write path over the scratch ledger the holder-swap test runs on (web ADR 0008): the same editor the page's
// server uses, its two requests, and a Snapshot read again after a write the test ran outside it.
import type { Snapshot } from "../src/lib/contract"
import { type EditAnswer, editAnswer } from "../src/lib/edit/answer"
import { BINARY } from "./edit-fixture.test-support"
import { editRequest, PARAMS, TOKEN } from "./edit-request.test-support"
import { recorded } from "./editor-running.test-support"
import { createEditor, type Editor } from "./serve-edit"

let editor: Editor | null = null

/** The editor over the scratch ledger, read once so an Edit has a Snapshot to answer. */
export async function openEditor(home: string, plan: string): Promise<Editor> {
	editor = recorded(
		createEditor({
			traj: { binary: BINARY, env: { ...process.env, TRAJ_HOME: home, DO_NOT_TRACK: "1" } },
			cliVersion: "test",
			params: { ...PARAMS, asOf: "2026-01-01", horizon: "2030-12-31", scenarios: [plan] },
			records: [],
			token: TOKEN,
		}),
	)
	const first = await editor.refresh()
	if (!first.ok) throw new Error(first.error.message)
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

/** The Snapshot read again, after a write the test ran outside the editor. */
export async function refresh(): Promise<Snapshot> {
	const run = await editorOf().refresh()
	if (!run.ok) throw new Error(run.error.message)
	return run.snapshot
}
