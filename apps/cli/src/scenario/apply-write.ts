import { z } from "zod"
import { type Context, ok, type Result } from "../command"
import { type AppError, isAppError } from "../errors"
import type { ScenarioSaved } from "../store"
import { withStore } from "../with-store"
import { removedLevyNotes } from "./apply-notes"
import { fromDecimalForm, printedRow } from "./decimal"
import { droppedAnchors, view, type WrittenScenario, writtenScenario } from "./view"

/**
 * What `scenario apply` prints: whether the write was rolled back, what it found, the row, and the
 * household anchors it dropped (cli ADR-0048).
 */
export type ApplyResult = {
	dryRun: boolean
	status: "created" | "updated" | "unchanged"
	scenario: WrittenScenario
	droppedAnchors: string[]
	notes: string[]
}

/** The fields every apply prints; the what-if form adds its Overrides beside them (cli ADR-0057). */
export const applyShape: {
	dryRun: z.ZodBoolean
	status: z.ZodEnum<{ created: "created"; updated: "updated"; unchanged: "unchanged" }>
	scenario: z.ZodType<WrittenScenario>
	droppedAnchors: z.ZodType<string[]>
	notes: z.ZodArray<z.ZodString>
} = {
	dryRun: z.boolean().describe("True when the write was rolled back."),
	status: z.enum(["created", "updated", "unchanged"]).describe("What the apply found."),
	scenario: writtenScenario,
	droppedAnchors,
	notes: z
		.array(z.string())
		.describe(
			"What this write took away that the document did not state, such as a Levy it no longer holds; empty when none.",
		),
}

export const applyResult: z.ZodType<ApplyResult> = z.strictObject(applyShape)

/** The flags `scenario apply` passes on once the forms are chosen. */
export type ApplyWrite = {
	name: string
	document: unknown
	decimal: boolean
	dryRun: boolean
	/** The content hash the caller read; the write is refused when the stored plan has another (cli ADR-0055). */
	ifHash?: string | undefined
}

/** The flags of the reply both forms share: what to print, and what the write took away. */
export type Reply = { decimal: boolean; dryRun: boolean; notes: string[] }

/** Prints what a store write found: the row, in decimal form under `--decimal` (ADR-0047). */
export function replyOf(outcome: ScenarioSaved, reply: Reply): Result<ApplyResult> | AppError {
	const rendered = printedRow(view(outcome.scenario), reply.decimal)
	if (isAppError(rendered)) return rendered
	const scenario: WrittenScenario = {
		...rendered,
		id: reply.dryRun && outcome.status === "created" ? null : rendered.id,
	}
	return ok({
		dryRun: reply.dryRun,
		status: outcome.status,
		scenario,
		droppedAnchors: outcome.droppedAnchors,
		notes: reply.notes,
	})
}

/**
 * Stores one applied document under its name and prints the row. A decimal document is converted
 * before the store sees it, so it is stored as minor units and its hash is the same either way; the
 * printed row is in decimal form under `--decimal` too (ADR-0047).
 */
export function writeApplied(ctx: Context, write: ApplyWrite): Result<ApplyResult> | AppError {
	const stored = write.decimal ? fromDecimalForm(write.document) : write.document
	if (isAppError(stored)) return stored
	return withStore(ctx, (store) => {
		const before = store.getScenario(write.name)
		if (isAppError(before)) return before
		const outcome = store.saveScenario(
			{ name: write.name, document: stored, expectedHash: write.ifHash },
			{ dryRun: write.dryRun },
		)
		if (isAppError(outcome)) return outcome
		return replyOf(outcome, {
			decimal: write.decimal,
			dryRun: write.dryRun,
			notes: removedLevyNotes(before?.document, stored, write.dryRun),
		})
	})
}
