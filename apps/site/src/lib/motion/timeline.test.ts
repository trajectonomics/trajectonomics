import { describe, expect, it } from "bun:test"
import {
	COMPARE_ALONE,
	COMPARE_WITH,
	HOW_FLOW,
	SEQUENCE_BOUNDS_MS,
	sequenceTimeline,
	timeline,
} from "./timeline"

/** The three sequences the sections play, with the bound each must settle inside. */
const SEQUENCES: readonly {
	readonly name: string
	readonly timeline: ReturnType<typeof sequenceTimeline>
	readonly boundMs: number
}[] = [
	{
		name: "the agent alone",
		timeline: sequenceTimeline(COMPARE_ALONE),
		boundMs: SEQUENCE_BOUNDS_MS.alone,
	},
	{
		name: "the agent with traj",
		timeline: sequenceTimeline(COMPARE_WITH),
		boundMs: SEQUENCE_BOUNDS_MS.withTraj,
	},
	{
		name: "the layer flow",
		timeline: sequenceTimeline(HOW_FLOW),
		boundMs: SEQUENCE_BOUNDS_MS.flow,
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

describe("the three sequences the sections play", () => {
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

	it("spaces the layer flow's steps, because a step that flies past cannot be read", () => {
		expect(HOW_FLOW.beatMs).toBeGreaterThanOrEqual(1_500)
		expect(HOW_FLOW.beatMs).toBeLessThanOrEqual(3_000)
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
