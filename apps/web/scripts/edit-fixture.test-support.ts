// The fictional ledger the Edit tests write to, through the workspace's own traj binary, and the
// editor that serves the write path over it.

import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { demoCarryIn } from "./demo/carry-in"
import { buildDemoLedger } from "./demo-ledger"
import { editRequest, PARAMS, TOKEN } from "./edit-request.test-support"
import { SLOW_MS } from "./edit-slow.test-support"
import { recorded } from "./editor-running.test-support"
import { makeScratch, removeScratch } from "./scratch"
import { createEditor, type Editor } from "./serve-edit"

/** The workspace's own traj binary, built by `turbo run build --filter=@trajectonomics/cli`. */
export const BINARY = fileURLToPath(new URL("../../cli/dist/traj", import.meta.url))
export { SLOW_MS }

/** An Edit's answer as the page parses it: the Snapshot, or the error as data. */
export type Answer =
	| {
			ok: true
			snapshot: { params: { scenarios: string[] }; reads: { projections: Record<string, unknown> } }
	  }
	| { ok: false; error: { code: string; message: string; path?: string } }

/** A Scenario's document in the decimal form, as the Snapshot and `traj scenario show --decimal` hold it. */
export type ShownDocument = {
	scenario: {
		contentHash: string
		version: number
		document: { flows: { id: string; amount?: string; end?: string }[] }
		household: { anchors: { path: string; person: string; age?: number }[] } | null
	}
}

let scratch = ""
let home = ""
let editor: Editor | null = null

/** The scratch data directory of the ledger the editor writes to. */
export function ledgerHome(): string {
	return home
}

/** The fictional ledger, built once; each Edit writes to it through the real traj. */
export async function setupEditor(): Promise<Editor> {
	if (editor !== null) return editor
	scratch = await makeScratch("traj-web-edit-")
	home = join(scratch, "traj-home")
	await buildDemoLedger({ binary: BINARY, home, scratch })
	// The demo ledger's Levy needs the Carry-in the demo states, or the projection of `base` is refused.
	const next = createEditor({
		traj: { binary: BINARY, env: { ...process.env, TRAJ_HOME: home } },
		cliVersion: "test",
		params: { ...PARAMS, scenarios: ["base"], carryIn: true },
		records: demoCarryIn(["base"]),
		token: TOKEN,
	})
	const run = await next.refresh()
	if (!run.ok) throw new Error(`the first read failed: ${run.error.message}`)
	editor = recorded(next)
	return editor
}

/** Posts one Edit body to the editor, as the page does, and parses the answer. */
export async function postEdit(body: string): Promise<{ status: number; answer: Answer }> {
	const response = await (await setupEditor()).edit(editRequest({}, body), 4321)
	return { status: response.status, answer: (await response.json()) as Answer }
}

/** Removes the scratch ledger, so the next test file builds its own. */
export async function disposeEditor(): Promise<void> {
	if (scratch !== "") await removeScratch(scratch)
	scratch = ""
	home = ""
	editor = null
}

export const copy = (name: string, from = "base") =>
	JSON.stringify({ kind: "copy-plan", from, name })
export const drop = (name: string) => JSON.stringify({ kind: "delete-plan", name })

/** The Scenario's document as the Snapshot answer holds it; throws when the read did not hold. */
export function shownOf(answer: { snapshot?: unknown }, name: string): ShownDocument {
	const reads = (
		answer.snapshot as {
			reads: { documents: Record<string, { ok: boolean; data: ShownDocument }> }
		}
	).reads
	const read = reads.documents[name]
	if (read === undefined || !read.ok) throw new Error(`no document read for ${name}`)
	return read.data
}

/** The document with one Flow's amount set to the given text, as the page sends it. */
export function withAmount(
	document: ShownDocument["scenario"]["document"],
	id: string,
	amount: string,
): ShownDocument["scenario"]["document"] {
	return {
		...document,
		flows: document.flows.map((flow) => (flow.id === id ? { ...flow, amount } : flow)),
	}
}

/** The stored content hash of a plan: the one a page that read it now would send with its Edit. */
export function hashOf(name: string): string {
	return ledgerShow(name, true).scenario.contentHash
}

/** `traj scenario show --json` on the scratch ledger, for the ledger's own answer. */
export function ledgerShow(name: string, decimal: boolean): ShownDocument {
	const flags = decimal ? ["--decimal"] : []
	const run = Bun.spawnSync([BINARY, "scenario", "show", ...flags, "--json", "--", name], {
		env: { ...process.env, TRAJ_HOME: home },
	})
	return JSON.parse(run.stdout.toString()) as ShownDocument
}
