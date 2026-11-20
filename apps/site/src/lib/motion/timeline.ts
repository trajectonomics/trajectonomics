/**
 * A moving section's choreography, as data: when each beat starts and ends, and when the sequence has
 * settled. It reads no clock and touches no DOM, so a test judges the order and the bound without a
 * browser, and the stylesheet only applies what this returns
 * ([ADR 0019](../../../docs/adr/0019-the-sections-motion-plays-once-on-entry.md)).
 */

import { FI_DEMO_OUTPUT } from "../site"

/** One beat's place in a sequence, in milliseconds from the moment the sequence starts. */
export interface Beat {
	readonly startMs: number
	readonly endMs: number
}

/** A sequence's beats in order, and the moment it settles. */
export interface Timeline {
	readonly beats: readonly Beat[]
	readonly totalMs: number
}

/** One animated sequence: its beats, each beat's length, and the gap before the next one. */
export interface Sequence {
	readonly beats: number
	readonly beatMs: number
	readonly gapMs: number
}

/** The most each section's sequence may take, so a copy edit cannot make the page crawl. */
export const SEQUENCE_BOUNDS_MS = Object.freeze({
	alone: 6_000,
	withTraj: 7_000,
	flow: 12_000,
})

/** The agent alone's exchange: eight messages, from the question to the confession. */
export const COMPARE_ALONE: Sequence = Object.freeze({ beats: 8, beatMs: 480, gapMs: 240 })

/** The agent with traj's exchange: seven messages, and one beat per line the CLI prints. */
export const COMPARE_WITH: Sequence = Object.freeze({
	beats: 7 + FI_DEMO_OUTPUT.length,
	beatMs: 300,
	gapMs: 120,
})

/** The layer flow's four steps, at two and three-quarter seconds each. */
export const HOW_FLOW: Sequence = Object.freeze({ beats: 4, beatMs: 2_750, gapMs: 0 })

/** The timeline of one sequence: one beat per message it passes, and the moment it settles. */
export function sequenceTimeline(sequence: Sequence): Timeline {
	return timeline(sequence.beats, sequence)
}

/** The timeline of `count` beats, each shaped alike: when each starts and ends, and the total. */
export function timeline(count: number, shape: Omit<Sequence, "beats">): Timeline {
	const beats: Beat[] = []
	for (let index = 0; index < Math.max(0, Math.trunc(count)); index++) {
		const startMs = index * (shape.beatMs + shape.gapMs)
		beats.push(Object.freeze({ startMs, endMs: startMs + shape.beatMs }))
	}
	return Object.freeze({ beats: Object.freeze(beats), totalMs: beats.at(-1)?.endMs ?? 0 })
}
