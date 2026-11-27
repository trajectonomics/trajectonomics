/**
 * The refusals a guided plan's document can come to ([web ADR 0031](../../../docs/adr/0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)):
 * the ledger moved, the CLI's own template changed, or no income or spending row is kept. Pure.
 */
import type { ErrorBody } from "../contract"
import { CONTRACT_MISMATCH } from "../snapshot/decode-read"

/** The refusal when the template no longer lines up with the rows the page read. */
export const LEDGER_CHANGED: ErrorBody = {
	code: "guided_ledger_changed",
	exitCode: 2,
	message: "The ledger changed since this page read it. Reload and check your money again.",
}

/** The refusal when the CLI's own template is not the document the contract states: the CLI or the contract changed. */
export const TEMPLATE_MISMATCH: ErrorBody = {
	code: CONTRACT_MISMATCH,
	exitCode: 1,
	message: "The CLI's decimal template no longer matches the Dashboard's contract.",
}

/** The refusal when the answers keep no income or spending row, so there is no plan to save. */
export const NO_FLOW: ErrorBody = {
	code: "guided_no_flow",
	exitCode: 2,
	message: "Keep at least one income or spending row.",
}
