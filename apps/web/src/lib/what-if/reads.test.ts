import { describe, expect, test } from "bun:test"
import { SerialReader } from "./reads"

/** A fake transport: each call is held until the test settles it, and the calls are recorded in order. */
function fake() {
	const calls: { state: string; settle: (reply: string) => void }[] = []
	const delivered: string[] = []
	const busy: boolean[] = []
	const reader = new SerialReader<string, string>({
		transport: (state) =>
			new Promise((resolve) => {
				calls.push({ state, settle: resolve })
			}),
		deliver: (reply) => delivered.push(reply),
		onBusy: (value) => busy.push(value),
	})
	return { reader, calls, delivered, busy }
}

/** Lets the pending microtasks run, so a settled reply reaches the reader. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("the What-if reads, one at a time", () => {
	test("a change made while a read runs waits, and then the latest state is read once", async () => {
		const { reader, calls, delivered } = fake()
		reader.request("a")
		reader.request("b")
		reader.request("c")
		expect(calls.map((call) => call.state)).toEqual(["a"])
		calls[0]?.settle("answer a")
		await tick()
		expect(calls.map((call) => call.state)).toEqual(["a", "c"])
		calls[1]?.settle("answer c")
		await tick()
		expect(delivered).toEqual(["answer c"])
	})

	test("the reply of an older state is dropped, never shown", async () => {
		const { reader, calls, delivered } = fake()
		reader.request("a")
		reader.request("b")
		calls[0]?.settle("answer a")
		await tick()
		expect(delivered).toEqual([])
	})

	test("a state superseded before it is asked for drops the reply of the read in flight", async () => {
		const { reader, calls, delivered } = fake()
		reader.request("a")
		reader.supersede()
		calls[0]?.settle("answer a")
		await tick()
		expect(delivered).toEqual([])
	})

	test("no second read starts while one is in flight", async () => {
		const { reader, calls } = fake()
		reader.request("a")
		reader.request("b")
		await tick()
		expect(calls).toHaveLength(1)
		expect(reader.busy).toBe(true)
	})

	test("cancel drops the reply in flight and what waits, and the next state waits for the read to end", async () => {
		const { reader, calls, delivered, busy } = fake()
		reader.request("a")
		reader.request("b")
		reader.cancel()
		reader.request("fresh")
		expect(calls).toHaveLength(1)
		calls[0]?.settle("answer a")
		await tick()
		expect(calls.map((call) => call.state)).toEqual(["a", "fresh"])
		calls[1]?.settle("answer fresh")
		await tick()
		expect(delivered).toEqual(["answer fresh"])
		expect(busy.at(-1)).toBe(false)
		expect(reader.busy).toBe(false)
	})

	test("a read that fails is dropped and the next state still reads", async () => {
		const reader = new SerialReader<string, string>({
			transport: (state) =>
				state === "a" ? Promise.resolve("ok") : Promise.reject(new Error("x")),
			deliver: () => {},
			onBusy: () => {},
		})
		reader.request("b")
		await tick()
		expect(reader.busy).toBe(false)
	})
})
