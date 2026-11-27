import { describe, expect, it } from "bun:test"
import {
	approvalTime,
	type ConsentRow,
	deviceApprovalRejection,
	pickConsentKeeper,
	unionValues,
} from "./consent"

const now = new Date("2026-11-27T12:00:00.000Z")

describe("deviceApprovalRejection", () => {
	const pending = {
		sessionUserId: "user-1",
		deviceUserId: "user-1",
		status: "pending",
		expiresAt: new Date("2026-11-27T12:10:00.000Z"),
		scope: "openid offline_access",
		now,
	}

	it("accepts a pending, unexpired code claimed by the session user", () => {
		expect(deviceApprovalRejection(pending)).toBeNull()
	})

	it("rejects an anonymous approval", () => {
		expect(deviceApprovalRejection({ ...pending, sessionUserId: undefined })).toBe("no-session")
		expect(deviceApprovalRejection({ ...pending, sessionUserId: "" })).toBe("no-session")
	})

	it("rejects a code that is not pending", () => {
		for (const status of ["approved", "denied", null, undefined]) {
			expect(deviceApprovalRejection({ ...pending, status })).toBe("not-pending")
		}
	})

	it("rejects an expired or unreadable code", () => {
		expect(
			deviceApprovalRejection({ ...pending, expiresAt: new Date("2026-11-27T12:00:00.000Z") }),
		).toBe("expired")
		expect(deviceApprovalRejection({ ...pending, expiresAt: null })).toBe("expired")
	})

	it("rejects a code claimed by somebody else", () => {
		expect(deviceApprovalRejection({ ...pending, deviceUserId: "user-2" })).toBe("not-owner")
	})

	it("lets an unclaimed code through so the endpoint answers its own 400", () => {
		expect(deviceApprovalRejection({ ...pending, deviceUserId: null })).toBeNull()
		expect(deviceApprovalRejection({ ...pending, deviceUserId: undefined })).toBeNull()
		expect(deviceApprovalRejection({ ...pending, deviceUserId: "" })).toBeNull()
	})

	it("rejects a code with no scope, so no poll can redeem without an approval record", () => {
		expect(deviceApprovalRejection({ ...pending, scope: "" })).toBe("no-scope")
		expect(deviceApprovalRejection({ ...pending, scope: "   " })).toBe("no-scope")
		expect(deviceApprovalRejection({ ...pending, scope: null })).toBe("no-scope")
	})
})

describe("unionValues", () => {
	it("keeps every scope and drops repeats, in first-seen order", () => {
		expect(
			unionValues([
				["openid", "offline_access"],
				["openid", "data:ingest"],
			]),
		).toEqual(["openid", "offline_access", "data:ingest"])
	})

	it("ignores empty values and empty lists", () => {
		expect(unionValues([[], [""], ["openid"]])).toEqual(["openid"])
		expect(unionValues([])).toEqual([])
	})
})

describe("approvalTime", () => {
	it("reads a Date or an ISO string", () => {
		expect(approvalTime(now)?.toISOString()).toBe(now.toISOString())
		expect(approvalTime("2026-11-27T12:00:00.000Z")?.toISOString()).toBe(now.toISOString())
	})

	it("rejects anything it cannot read", () => {
		expect(approvalTime(undefined)).toBeNull()
		expect(approvalTime(null)).toBeNull()
		expect(approvalTime(123)).toBeNull()
		expect(approvalTime("not-a-date")).toBeNull()
		expect(approvalTime(new Date("not-a-date"))).toBeNull()
	})
})

describe("pickConsentKeeper", () => {
	const rows: ConsentRow[] = [
		{ id: "b", createdAt: "2026-11-27T12:00:00.000Z" },
		{ id: "a", createdAt: "2026-11-26T12:00:00.000Z" },
		{ id: "c", createdAt: "2026-11-27T12:00:00.000Z" },
	]

	it("keeps the oldest approval so a merge never moves createdAt forward", () => {
		expect(pickConsentKeeper(rows)).toBe("a")
	})

	it("breaks a tie on the smallest id so concurrent passes converge", () => {
		expect(pickConsentKeeper(rows.slice(0, 1).concat(rows.slice(2)))).toBe("b")
	})

	it("returns null for no usable row", () => {
		expect(pickConsentKeeper([])).toBeNull()
		expect(pickConsentKeeper([{ id: "" }])).toBeNull()
	})
})
