import { type HtmlElement, type ScannedPage, textOf } from "../../lib/build/html"
import { withAttribute, withClass } from "./scan"

/** The chat of one side in the demo window, the one element the window renders for it. */
export function chatOf(page: ScannedPage, side: string): HtmlElement {
	const chat = withAttribute(page, "data-chat", side)[0]
	if (chat === undefined) throw new Error(`the window rendered no ${side} chat`)
	return chat
}

/** The messages of one chat, in document order. */
export function messagesOf(page: ScannedPage, side: string): readonly HtmlElement[] {
	const chat = chatOf(page, side)
	return withClass(page, "chat-message").filter((message) => message.ancestors.includes(chat))
}

/** What one chat says, message by message, with the speaker's label in front of each. */
export function exchangeOf(page: ScannedPage, side: string): readonly string[] {
	return messagesOf(page, side).map((message) => textOf(page, message))
}
