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

/**
 * A chat that stops to run the CLI: its messages at a reading pace, and the lines the CLI prints at
 * their own quicker one, inside the beat of the message that shows them.
 */
export interface PacedSequence extends Sequence {
	/** The beat, counted from zero, whose message runs the CLI and prints its lines. */
	readonly linesAt: number
	/** How many lines the CLI prints: one beat each. */
	readonly lines: number
	/** How long one printed line is on screen, in milliseconds. */
	readonly lineMs: number
}

/** One prompt typed into the composer: when it starts, how long it takes, and when it is sent. */
export interface Typing {
	readonly startMs: number
	readonly typeMs: number
	/** The moment the prompt leaves the composer and its message lands: the chat's first beat. */
	readonly sentMs: number
}

/** The most each chat may take from the first keystroke, so a copy edit cannot make the page crawl. */
export const SEQUENCE_BOUNDS_MS = Object.freeze({
	alone: 17_000,
	withTraj: 17_000,
})

/** The pause before the first key, one key's length, and the hold between the last key and Send. */
const TYPING = Object.freeze({ startMs: 300, keyMs: 45, holdMs: 450 })

/** How long the Before chat is left alone before New chat is pressed for the visitor, in milliseconds. */
export const HINT_MS = 2_500

/** The agent alone's exchange: eight messages at reading pace, from the question to the confession. */
export const COMPARE_ALONE: Sequence = Object.freeze({ beats: 8, beatMs: 1_400, gapMs: 400 })

/**
 * The agent with traj's exchange: seven messages at reading pace, and one quicker beat per line the CLI
 * prints, so the terminal reads like a terminal and the chat reads like a chat.
 */
export const COMPARE_WITH: PacedSequence = Object.freeze({
	beats: 7,
	beatMs: 1_000,
	gapMs: 200,
	linesAt: 5,
	lines: FI_DEMO_OUTPUT.length,
	lineMs: 200,
})

/** One prompt typed key by key: its start, its length for `chars` keys, and the moment it is sent. */
export function typing(chars: number): Typing {
	const typeMs = Math.max(0, Math.trunc(chars)) * TYPING.keyMs
	return Object.freeze({
		startMs: TYPING.startMs,
		typeMs,
		sentMs: TYPING.startMs + typeMs + TYPING.holdMs,
	})
}

/**
 * The timeline of one sequence, with the CLI's lines spliced in where the message that runs them is.
 * `leadMs` is what comes before the first message (the prompt being typed), so every beat starts later.
 */
export function sequenceTimeline(sequence: Sequence | PacedSequence, leadMs = 0): Timeline {
	if (!("lines" in sequence)) return timeline(sequence.beats, sequence, leadMs)
	const messages = Array.from({ length: sequence.beats }, () => sequence.beatMs)
	const lines = Array.from({ length: sequence.lines }, () => sequence.lineMs)
	const at = sequence.linesAt + 1
	return fromLengths(
		[...messages.slice(0, at), ...lines, ...messages.slice(at)],
		sequence.gapMs,
		leadMs,
	)
}

/** The timeline of `count` beats, each shaped alike: when each starts and ends, and the total. */
export function timeline(count: number, shape: Omit<Sequence, "beats">, leadMs = 0): Timeline {
	const lengths = Array.from({ length: Math.max(0, Math.trunc(count)) }, () => shape.beatMs)
	return fromLengths(lengths, shape.gapMs, leadMs)
}

/** The timeline of beats of the given lengths, each a gap after the one before it: the total is the last end. */
function fromLengths(lengths: readonly number[], gapMs: number, leadMs: number): Timeline {
	const beats: Beat[] = []
	let atMs = Math.max(0, leadMs)
	for (const beatMs of lengths) {
		beats.push(Object.freeze({ startMs: atMs, endMs: atMs + beatMs }))
		atMs += beatMs + gapMs
	}
	return Object.freeze({ beats: Object.freeze(beats), totalMs: beats.at(-1)?.endMs ?? 0 })
}
