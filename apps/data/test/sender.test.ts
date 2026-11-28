import { describe, expect, test } from "bun:test"
import { resolveSender, type SenderLookup, type SenderResolution } from "../src/core/sender"

type Sender = Extract<SenderResolution, { kind: "sender" }>

const ORG_SENDER: Sender = {
	kind: "sender",
	principal: { contributorId: "trajectonomics", series: "measured-by-us" },
	bindOrg: false,
}
const ORG_BINDING: Sender = { ...ORG_SENDER, bindOrg: true }

function lookup(overrides: Partial<SenderLookup> = {}): SenderLookup {
	return { contributorId: null, kind: null, deleted: false, orgUnbound: false, ...overrides }
}

function resolve(sub: string, row: SenderLookup, orgAuthUserId: string | undefined = undefined) {
	return resolveSender({ sub, lookup: row, orgAuthUserId })
}

describe("resolveSender", () => {
	test("rule 1: a tombstoned sub is account_deleted before anything else", () => {
		expect(
			resolve("auth-a", lookup({ contributorId: "trajectonomics", kind: "org", deleted: true })),
		).toEqual({ kind: "rejected", error: "account_deleted" })
		expect(resolve("auth-a", lookup({ deleted: true, orgUnbound: true }), "auth-a")).toEqual({
			kind: "rejected",
			error: "account_deleted",
		})
	})

	test("rule 2: a bound org contributor sends as the org without binding again", () => {
		expect(
			resolve(
				"auth-a",
				lookup({ contributorId: "trajectonomics", kind: "org", orgUnbound: false }),
				"auth-b",
			),
		).toEqual(ORG_SENDER)
	})

	test("rule 3: a bound community contributor is not_a_contributor", () => {
		expect(
			resolve(
				"auth-a",
				lookup({ contributorId: "community-1", kind: "community", orgUnbound: true }),
				"auth-a",
			),
		).toEqual({ kind: "rejected", error: "not_a_contributor" })
	})

	test("rule 4: the owner's sub binds the unbound org row", () => {
		expect(resolve("auth-a", lookup({ orgUnbound: true }), "auth-a")).toEqual(ORG_BINDING)
	})

	test("rule 5: an unknown sub with no secret is not_a_contributor", () => {
		expect(resolve("auth-a", lookup({ orgUnbound: true }))).toEqual({
			kind: "rejected",
			error: "not_a_contributor",
		})
	})

	test("rule 5: the owner's sub is not_a_contributor once the org is bound", () => {
		expect(resolve("auth-a", lookup({ orgUnbound: false }), "auth-a")).toEqual({
			kind: "rejected",
			error: "not_a_contributor",
		})
	})

	test("rule 5: an empty secret binds nothing", () => {
		expect(resolve("", lookup({ orgUnbound: true }), "")).toEqual({
			kind: "rejected",
			error: "not_a_contributor",
		})
	})

	test("rule 5: a different sub never borrows the owner's binding", () => {
		expect(resolve("auth-b", lookup({ orgUnbound: true }), "auth-a")).toEqual({
			kind: "rejected",
			error: "not_a_contributor",
		})
	})
})
