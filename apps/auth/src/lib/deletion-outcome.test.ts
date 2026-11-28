import { describe, expect, it } from "bun:test"
import { deletionFailureOutcome } from "./deletion-outcome"

describe("deletionFailureOutcome", () => {
	it("reads a 4xx answer as the server refusing", () => {
		expect(deletionFailureOutcome({ status: 400 })).toBe("refused")
		expect(deletionFailureOutcome({ status: 401 })).toBe("refused")
		expect(deletionFailureOutcome({ status: 403 })).toBe("refused")
	})

	it("leaves a 5xx answer unconfirmed", () => {
		expect(deletionFailureOutcome({ status: 500 })).toBe("unconfirmed")
		expect(deletionFailureOutcome({ status: 503 })).toBe("unconfirmed")
	})

	it("leaves a network error, a missing status or no error unconfirmed", () => {
		expect(deletionFailureOutcome(new TypeError("fetch failed"))).toBe("unconfirmed")
		expect(deletionFailureOutcome({ status: 0 })).toBe("unconfirmed")
		expect(deletionFailureOutcome({})).toBe("unconfirmed")
		expect(deletionFailureOutcome(null)).toBe("unconfirmed")
		expect(deletionFailureOutcome(undefined)).toBe("unconfirmed")
	})
})
