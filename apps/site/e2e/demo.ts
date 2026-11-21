import type { Page } from "@playwright/test"
import { dictionaryFor } from "../src/lib/language/languages"
import { COMPARE_ALONE, COMPARE_WITH, sequenceTimeline, typing } from "../src/lib/motion/timeline"
import { DEMO_SKILL_COMMAND } from "../src/lib/site"
import { homeOf } from "./pages"

/** The English home, whose demo window plays its two chats in turn (ADR 0022). */
export const HOME = homeOf("en")

/** That home's Dictionary. */
export const dictionary = dictionaryFor(HOME.language)

/** The keys of each chat's typed prompt, so a test waits as long as the page does. */
export const KEYS = {
	without: [...dictionary.actionQuestion].length,
	with: [...`${DEMO_SKILL_COMMAND} ${dictionary.actionQuestion}`].length,
}

/** How long each chat takes from its first key to its last message, in milliseconds. */
export const ALONE_MS = sequenceTimeline(COMPARE_ALONE, typing(KEYS.without).sentMs).totalMs
export const WITH_MS = sequenceTimeline(COMPARE_WITH, typing(KEYS.with).sentMs).totalMs

/** The selector of one message's bubble in one chat, one-based as CSS counts. */
export function bubble(side: string, index: number): string {
	return `.app-chat[data-chat="${side}"] .chat-message:nth-child(${index + 1}) .chat-bubble`
}

/** The window's stage: which chat is on screen. */
export function stage(page: Page) {
	return page.locator("[data-app]")
}
