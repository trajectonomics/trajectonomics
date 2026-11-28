/**
 * The `source` of an Edit an inline action sends, such as Done on a routing list or "Make this my main plan". Only the
 * control that sent it shows its refusal, so every other form and notice leaves an action's source alone (web ADR 0008).
 */
const PREFIX = "action:"

/** The source of one control's action, from the words that tell it from every other control. */
export function actionSource(...words: readonly string[]): string {
	return `${PREFIX}${words.join(":")}`
}

/** Whether an inline action sent the last request, so no form shows what it answered. */
export function isActionSource(source: string): boolean {
	return source.startsWith(PREFIX)
}
