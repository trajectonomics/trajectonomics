import { describe, expect, test } from "bun:test"
import { refuseEdit } from "../src/lib/edit/guard"
import { createEditGate } from "./edit-gate"
import { TOKEN } from "./edit-request.test-support"

/** The facts of a request that holds every other guard, so only `busy` decides it. */
function facts(busy: boolean) {
	return {
		method: "POST",
		host: "127.0.0.1:4321",
		origin: "http://127.0.0.1:4321",
		token: TOKEN,
		contentType: "application/json",
		expectedToken: TOKEN,
		ready: true,
		busy,
		port: 4321,
	}
}

describe("the one-Edit-at-a-time gate", () => {
	test("is busy while its work runs, and free once it answers", async () => {
		const gate = createEditGate()
		expect(gate.busy).toBe(false)
		const running = gate.run(async () => "done")
		expect(gate.busy).toBe(true)
		expect(refuseEdit(facts(gate.busy))?.code).toBe("edit_running")
		expect(await running).toBe("done")
		expect(gate.busy).toBe(false)
		expect(refuseEdit(facts(gate.busy))).toBeNull()
	})

	test("frees the gate when the work threw, so the next request is not refused as running", async () => {
		const gate = createEditGate()
		const threw = gate.run(() => Promise.reject(new Error("the write threw")))
		await expect(threw).rejects.toThrow("the write threw")
		expect(gate.busy).toBe(false)
		expect(refuseEdit(facts(gate.busy))).toBeNull()
		expect(await gate.run(async () => "next")).toBe("next")
	})

	test("frees the gate when the work threw before it answered with a promise", async () => {
		const gate = createEditGate()
		const threw = gate.run((): Promise<never> => {
			throw new Error("the write threw at once")
		})
		await expect(threw).rejects.toThrow("the write threw at once")
		expect(gate.busy).toBe(false)
		expect(refuseEdit(facts(gate.busy))).toBeNull()
	})
})
