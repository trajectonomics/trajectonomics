import { describe, expect, it } from "bun:test"
import {
	COMPARE_ALONE,
	COMPARE_WITH,
	HOW_FLOW,
	SEQUENCE_BOUNDS_MS,
	type Sequence,
	sequenceTimeline,
	timeline,
} from "./timeline"

/** The three sequences the sections play, with the bound each must settle inside. */
const SEQUENCES: readonly {
	readonly name: string
	readonly sequence: Sequence
	readonly boundMs: number
}[] = [
	{ name: "the agent alone", sequence: COMPARE_ALONE, boundMs: SEQUENCE_BOUNDS_MS.alone },
	{ name: "the agent with traj", sequence: COMPARE_WITH, boundMs: SEQUENCE_BOUNDS_MS.withTraj },
	{ name: "the layer flow", sequence: HOW_FLOW, boundMs: SEQUENCE_BOUNDS_MS.flow },
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
	for (const { name, sequence, boundMs } of SEQUENCES) {
		it(`settles ${name} inside ${boundMs} ms, however many beats it has`, () => {
			expect(sequenceTimeline(sequence).beats).toHaveLength(sequence.beats)
			expect(sequenceTimeline(sequence).totalMs).toBeLessThanOrEqual(boundMs)
		})
	}

	it("spaces the layer flow's steps, because a step that flies past cannot be read", () => {
		expect(HOW_FLOW.beatMs).toBeGreaterThanOrEqual(1_500)
		expect(HOW_FLOW.beatMs).toBeLessThanOrEqual(3_000)
	})

	it("runs the two panels' chats no slower than the layer flow", () => {
		expect(COMPARE_ALONE.beatMs).toBeLessThanOrEqual(HOW_FLOW.beatMs)
		expect(COMPARE_WITH.beatMs).toBeLessThanOrEqual(HOW_FLOW.beatMs)
	})
})
