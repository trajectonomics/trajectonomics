import type { SecurityEvidence } from "./types"

/** The security-review booleans, kept in their own file so `checks.ts` stays small. */
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
		revokeHoldsWithManyVerificationRows: gates.revokeHoldsWithManyVerificationRows,
		deviceCodeContentTypeSmugglingRejected: gates.deviceCodeContentTypeSmugglingRejected,
		postAuthorizeRejected: gates.postAuthorizeRejected,
		expiredConsentNeverIssuesCode: gates.expiredConsentNeverIssuesCode,
		deviceConsentExistsBeforeRedeem: gates.deviceConsentExistsBeforeRedeem,
		revokeRemovesDuplicateConsents: gates.revokeRemovesDuplicateConsents,
		emptyScopeDeviceRequestRejected: gates.emptyScopeDeviceRequestRejected,
		consentScopesAreUnion: gates.consentScopesAreUnion,
	}
}
