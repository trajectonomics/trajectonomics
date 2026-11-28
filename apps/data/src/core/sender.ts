import type { Principal } from "./types"

/** What one D1 read says about a token's `sub` and the org row (ADR 0015). */
export type SenderLookup = {
	/** The contributor holding this `sub` in `auth_user_id`, or null. */
	contributorId: string | null
	/** That contributor's kind, or null when none holds the `sub`. */
	kind: "org" | "community" | null
	/** Whether `contributor_tombstone` holds the `sub`'s hash. */
	deleted: boolean
	/** Whether the org row still has no `auth_user_id`. */
	orgUnbound: boolean
}

/** A verified sender, or the rule that refused it. */
export type SenderResolution =
	| { kind: "sender"; principal: Principal; bindOrg: boolean }
	| { kind: "rejected"; error: "account_deleted" | "not_a_contributor" }

const ORG_PRINCIPAL: Principal = { contributorId: "trajectonomics", series: "measured-by-us" }

function rejected(error: "account_deleted" | "not_a_contributor"): SenderResolution {
	return { kind: "rejected", error }
}

/**
 * Decides who a verified token sends as. A tombstone wins over every binding; the org row is bound
 * by the token whose `sub` equals `ORG_AUTH_USER_ID` while the row is still unbound; community
 * ingest is closed until ADR 0013, so it is refused even where the contributor exists.
 */
export function resolveSender(input: {
	sub: string
	lookup: SenderLookup
	orgAuthUserId: string | undefined
}): SenderResolution {
	const { sub, lookup } = input
	if (lookup.deleted) return rejected("account_deleted")
	if (lookup.contributorId !== null && lookup.kind === "org") {
		return { kind: "sender", principal: ORG_PRINCIPAL, bindOrg: false }
	}
	if (lookup.contributorId !== null && lookup.kind === "community") {
		return rejected("not_a_contributor")
	}
	const orgAuthUserId = input.orgAuthUserId ?? ""
	if (orgAuthUserId.length > 0 && sub === orgAuthUserId && lookup.orgUnbound) {
		return { kind: "sender", principal: ORG_PRINCIPAL, bindOrg: true }
	}
	return rejected("not_a_contributor")
}
