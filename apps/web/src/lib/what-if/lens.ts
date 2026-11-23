/**
 * The what-if as the figure pages read it: the four reads of the session's answer, parsed against the
 * contract, and the rule for when a page may show them. Pure: the client holds the answer and asks here.
 * A read that failed or does not parse is `null`, so a page shows its baseline for that figure and the
 * session bar shows the refusal.
 */
import type { z } from "zod"
import {
	type Fi,
	fi as fiSchema,
	type ProjectionChance,
	type ProjectionCompare,
	type ProjectionRun,
	projectionChance,
	projectionCompare,
	projectionRun,
	type Read,
	readOf,
} from "../contract"
import type { WhatIfAnswer } from "./answer"
import { hasChanges, overridesOf, type WhatIf } from "./session"

/** The four reads of one answer, each parsed; `null` for a read that failed, did not parse or was not asked. */
export type WhatIfReads = {
	readonly run: ProjectionRun | null
	readonly fi: Fi | null
	readonly compare: ProjectionCompare | null
	readonly chance: ProjectionChance | null
}

/** The reads a page may show: they belong to one plan, and answer the changes the session holds now. */
export type WhatIfLens = WhatIfReads & { readonly plan: string }

/** The data of one read of the answer, or null when the CLI refused it or the data is not the contract's. */
function dataOf<T extends z.ZodType>(schema: T, read: unknown): z.output<T> | null {
	if (read === null || read === undefined) return null
	const parsed = readOf(schema).safeParse(read)
	if (!parsed.success) return null
	const value = parsed.data as Read<z.output<T>>
	return value.ok ? value.data : null
}

/** The four reads of an answer, parsed. A refused request has none. */
export function readsOf(answer: WhatIfAnswer): WhatIfReads {
	if (!answer.ok) return { run: null, fi: null, compare: null, chance: null }
	return {
		run: dataOf(projectionRun, answer.reads.projection),
		fi: dataOf(fiSchema, answer.reads.fi),
		compare: dataOf(projectionCompare, answer.reads.compare),
		chance: dataOf(projectionChance, answer.reads.chance),
	}
}

/** Whether two states of the session hold the same plan and the same changes, in the same order. */
export function sameChanges(a: WhatIf, b: WhatIf): boolean {
	return a.plan === b.plan && JSON.stringify(overridesOf(a)) === JSON.stringify(overridesOf(b))
}

/**
 * The lens a page on `plan` may show, or null. A page shows the session only when it is on the session's plan,
 * only while the session holds a change, and only when the reads are the answer to those changes: a reply for
 * an earlier state is never shown beside a later one.
 */
export function lensFor(
	plan: string,
	session: WhatIf | null,
	answered: WhatIf | null,
	reads: WhatIfReads | null,
): WhatIfLens | null {
	if (session === null || answered === null || reads === null) return null
	if (session.plan !== plan || !sameChanges(session, answered)) return null
	if (!hasChanges(session)) return null
	return { plan, ...reads }
}
