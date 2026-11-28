import { describe, expect, test } from "bun:test"
import { type Bearer, lazyBearer } from "../src/send/bearer"

const TOKEN: Bearer = { bearer: "synthetic-token", kind: "token" }

describe("lazyBearer", () => {
	test("resolves once, at the first call, and reuses the promise", async () => {
		let calls = 0
		const bearer = lazyBearer(async () => {
			calls += 1
			return TOKEN
		})

		expect(calls).toBe(0)
		expect(await bearer()).toEqual(TOKEN)
		expect(await bearer()).toEqual(TOKEN)
		expect(calls).toBe(1)
	})

	test("memoises a rejection too", async () => {
		let calls = 0
		const bearer = lazyBearer(async () => {
			calls += 1
			throw new Error("synthetic bearer failure")
		})

		await expect(bearer()).rejects.toThrow("synthetic bearer failure")
		await expect(bearer()).rejects.toThrow("synthetic bearer failure")
		expect(calls).toBe(1)
	})
})
