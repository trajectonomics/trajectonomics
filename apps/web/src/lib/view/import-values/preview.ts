import type { PreviewAnswer } from "../../edit/answer"
import { type ImportRefusal, importRefusal } from "./refusals"
import type { ImportEntry } from "./types"

/** What the review knows of the dry run: not asked yet, running, what traj would do, or what it refused. */
export type ImportPreview =
	| { readonly state: "idle" }
	| { readonly state: "running" }
	| { readonly state: "ready"; readonly added: number; readonly unchanged: number }
	| { readonly state: "refused"; readonly refusal: ImportRefusal }

export const IDLE: ImportPreview = { state: "idle" }
export const RUNNING: ImportPreview = { state: "running" }

/** A refusal that is one sentence for the whole batch. */
export function refusedWith(message: string): ImportPreview {
	return { state: "refused", refusal: { values: [], general: message } }
}

/** The dry run's answer as the review shows it: traj's own counts, or each refused value at its row and column. */
export function previewOf(answer: PreviewAnswer, sent: readonly ImportEntry[]): ImportPreview {
	if (!answer.ok) return { state: "refused", refusal: importRefusal(answer.error, sent) }
	const { added, unchanged } = answer.result.counts
	return { state: "ready", added, unchanged }
}
