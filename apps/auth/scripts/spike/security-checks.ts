import type { SecurityEvidence } from "./types"

/** The nine security-review booleans, kept in their own file so `checks.ts` stays small. */
export function securityChecks(gates: SecurityEvidence): Record<string, boolean> {
	return {
		paddedGrantTypeRejected: gates.paddedGrantTypeRejected,
		revokeBeforeRedemptionHolds: gates.revokeBeforeRedemptionHolds,
		dashedUserCodeCreatesConsent: gates.dashedUserCodeCreatesConsent,
		deleteConsentPathDisabled: gates.deleteConsentPathDisabled,
		oldTokenNotRevivedByNewApproval: gates.oldTokenNotRevivedByNewApproval,
		expiredDeviceCodePollCreatesNoConsent: gates.expiredDeviceCodePollCreatesNoConsent,
		smuggledJsonResourceArrayRejected: gates.smuggledJsonResourceArrayRejected,
		reapprovalAfterExpiryWorks: gates.reapprovalAfterExpiryWorks,
		revokeKillsPendingAuthCode: gates.revokeKillsPendingAuthCode,
	}
}
