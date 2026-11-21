import { describe, expect, it } from "bun:test"
import {
	COMPARE_ALONE,
	COMPARE_WITH,
	HINT_MS,
	SEQUENCE_BOUNDS_MS,
	sequenceTimeline,
	timeline,
	typing,
} from "./timeline"

/** The longest prompt either Language types, in keys: the skill command, a space and the question. */
const LONGEST_PROMPT_KEYS = 40

/** The two chats the window plays, each with the prompt typed before it and the bound it must settle inside. */
const SEQUENCES: readonly {
	readonly name: string
	readonly timeline: ReturnType<typeof sequenceTimeline>
	readonly boundMs: number
}[] = [
	{
		name: "the agent alone",
		timeline: sequenceTimeline(COMPARE_ALONE, typing(LONGEST_PROMPT_KEYS).sentMs),
		boundMs: SEQUENCE_BOUNDS_MS.alone,
	},
	{
		name: "the agent with traj",
		timeline: sequenceTimeline(COMPARE_WITH, typing(LONGEST_PROMPT_KEYS).sentMs),
		boundMs: SEQUENCE_BOUNDS_MS.withTraj,
	},
]

describe("a sequence's timeline", () => {
	it("gives one beat per message, in the order the page shows them", () => {
		const sequence = timeline(4, { beatMs: 100, gapMs: 50 })
		expect(sequence.beats).toHaveLength(4)
		expect(sequence.beats.map((beat) => beat.startMs)).toEqual([0, 150, 300, 450])
	})

	it("keeps every beat inside its own slot, so no two arrive at once", () => {
		const sequence = timeline(6, { beatMs: 100, gapMs: 50 })
		for (const [index, beat] of sequence.beats.entries()) {
			expect(beat.endMs).toBeGreaterThan(beat.startMs)
			const next = sequence.beats[index + 1]
			if (next !== undefined) expect(next.startMs).toBeGreaterThanOrEqual(beat.endMs)
		}
	})

	it("settles at the last beat's end, and nowhere later", () => {
		const sequence = timeline(3, { beatMs: 200, gapMs: 100 })
		const last = sequence.beats.at(-1)
		if (last === undefined) throw new Error("three beats produced none")
		expect(sequence.totalMs).toBe(last.endMs)
	})

	it("gives no beat and no total for an empty sequence", () => {
		const sequence = timeline(0, { beatMs: 200, gapMs: 100 })
		expect(sequence.beats).toEqual([])
		expect(sequence.totalMs).toBe(0)
	})

	it("is frozen, so a section cannot rewrite the choreography it was given", () => {
		const sequence = timeline(2, { beatMs: 200, gapMs: 100 })
		const beat = sequence.beats[0]
		if (beat === undefined) throw new Error("two beats produced none")
		expect(Object.isFrozen(sequence)).toBe(true)
		expect(Object.isFrozen(sequence.beats)).toBe(true)
		expect(Object.isFrozen(beat)).toBe(true)
	})
})

describe("the two chats the demo window plays", () => {
	for (const { name, timeline, boundMs } of SEQUENCES) {
		it(`settles ${name} inside ${boundMs} ms, however many beats it has`, () => {
			expect(timeline.totalMs).toBeLessThanOrEqual(boundMs)
			expect(timeline.totalMs).toBeGreaterThan(0)
		})
	}

	it("gives the agent alone one beat per message, and the agent with traj one per line too", () => {
		expect(sequenceTimeline(COMPARE_ALONE).beats).toHaveLength(COMPARE_ALONE.beats)
		expect(sequenceTimeline(COMPARE_WITH).beats).toHaveLength(
			COMPARE_WITH.beats + COMPARE_WITH.lines,
		)
	})

	it("starts the first message when the typed prompt is sent, and not before", () => {
		const sent = typing(24).sentMs
		expect(sequenceTimeline(COMPARE_ALONE, sent).beats[0]?.startMs).toBe(sent)
		expect(sequenceTimeline(COMPARE_ALONE).beats[0]?.startMs).toBe(0)
		// The lead only moves a chat later: the spacing between its beats is its own.
		const beats = sequenceTimeline(COMPARE_ALONE, sent).beats
		const bare = sequenceTimeline(COMPARE_ALONE).beats
		expect(beats.map((beat) => beat.startMs - sent)).toEqual(bare.map((beat) => beat.startMs))
	})

	it("reads a message at a visitor's pace, so the chat cannot outrun its reader", () => {
		for (const { beatMs, gapMs } of [COMPARE_ALONE, COMPARE_WITH]) {
			expect(beatMs + gapMs).toBeGreaterThanOrEqual(1_200)
			expect(beatMs + gapMs).toBeLessThanOrEqual(2_000)
		}
	})

	it("prints the CLI's lines faster than it reads a message, inside the beat that runs them", () => {
		const guided = sequenceTimeline(COMPARE_WITH)
		const first = guided.beats[COMPARE_WITH.linesAt + 1]
		const second = guided.beats[COMPARE_WITH.linesAt + 2]
		const answer = guided.beats.at(-1)
		if (first === undefined || second === undefined || answer === undefined)
			throw new Error("the guided chat is shorter than its own lines")
		expect(second.startMs - first.startMs).toBe(COMPARE_WITH.lineMs + COMPARE_WITH.gapMs)
		// A line is a glance and a message is a sentence: the output prints at half a message's pace.
		expect(COMPARE_WITH.lineMs + COMPARE_WITH.gapMs).toBeLessThanOrEqual(
			(COMPARE_WITH.beatMs + COMPARE_WITH.gapMs) / 2,
		)
		// The answer is the beat after the last line: nothing lands on top of the output it reads.
		expect(answer.startMs).toBeGreaterThanOrEqual(
			second.startMs + (COMPARE_WITH.lines - 1) * (COMPARE_WITH.lineMs + COMPARE_WITH.gapMs),
		)
	})
})

describe("a prompt typed into the composer", () => {
	it("takes one key's time per character, after a beat and before a hold", () => {
		const typed = typing(10)
		expect(typed.typeMs).toBe(10 * (typing(11).typeMs - typed.typeMs))
		expect(typed.startMs).toBeGreaterThan(0)
		expect(typed.sentMs).toBeGreaterThan(typed.startMs + typed.typeMs)
	})

	it("types a longer prompt for longer, and an empty one not at all", () => {
		expect(typing(30).typeMs).toBeGreaterThan(typing(20).typeMs)
		expect(typing(0).typeMs).toBe(0)
		expect(typing(-3).typeMs).toBe(0)
	})

	it("is frozen, so the stylesheet is given a number nobody can change", () => {
		expect(Object.isFrozen(typing(5))).toBe(true)
	})

	it("leaves the visitor a beat to read the Before chat before New chat is pressed", () => {
		expect(HINT_MS).toBeGreaterThanOrEqual(1_500)
		expect(HINT_MS).toBeLessThanOrEqual(4_000)
	})
})
