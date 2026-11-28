import { MINUS } from "./money"

/** What a hidden amount shows in place of its digits. */
export const AMOUNT_MASK = "•••••"

/** The one character a mask holds, which no amount a person types does. */
const MASK_CHARACTER = "•"

/**
 * The hidden form of a money display string: its sign stays, its digits become the mask. A
 * positive amount shows the mask alone.
 */
export function maskMoney(display: string): string {
	const negative = display.startsWith(MINUS) || display.startsWith("-")
	return negative ? `${MINUS}${AMOUNT_MASK}` : AMOUNT_MASK
}

/**
 * The draft a field takes from an `input` event: the text typed, or the held draft when the text holds the mask, which
 * Undo can put back after the focus that showed the real value.
 */
export function draftAfterInput(held: string, typed: string): string {
	return typed.includes(MASK_CHARACTER) ? held : typed
}

/** What an `input` event leaves at a masked money field: the draft it means, and the draft the last Undo took away. */
export interface MaskedDraft {
	/** The draft the field holds after the event. */
	draft: string
	/** The draft the last Undo took away, which only its Redo puts back. */
	undone: string | null
}

/**
 * The draft a change makes at a money field with Hide amounts on. The mask writes text the browser's own history does
 * not hold, so an Undo or a Redo is read for what it means rather than for the text it composes: a step whose text
 * holds the mask keeps the draft it hides, an Undo takes the text it restores, and a Redo lands only when it restores
 * what its Undo took away, so a Redo never doubles an amount.
 */
export function maskedDraft(
	held: string,
	undone: string | null,
	typed: string,
	inputType: string,
): MaskedDraft {
	if (inputType !== "historyUndo" && inputType !== "historyRedo") {
		return { draft: draftAfterInput(held, typed), undone: null }
	}
	if (typed.includes(MASK_CHARACTER)) return { draft: held, undone: held }
	if (inputType === "historyUndo") return { draft: typed, undone: held }
	return { draft: undone === typed ? typed : held, undone: null }
}
