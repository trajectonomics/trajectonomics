import type { Session } from "./http"
import { checkExpiredPollCreatesNoConsent, checkOldTokenNotRevived } from "./security-consent"
import {
	checkDashedUserCode,
	checkPaddedGrantType,
	checkRevokeBeforeRedemption,
} from "./security-device"
import {
	checkConsentScopesAreUnionOnApproval,
	checkDeviceConsentExistsBeforeRedeem,
} from "./security-device-consent"
import { checkRevokeRemovesDuplicateConsents } from "./security-duplicates"
import { checkReapprovalAfterExpiry, checkRevokeKillsPendingAuthCode } from "./security-expiry"
import { checkExpiredConsentNeverIssuesCode } from "./security-expiry-followup"
import { checkRevokeHoldsWithManyVerificationRows } from "./security-paging"
import {
	checkDeviceCodeContentTypeSmugglingRejected,
	checkEmptyScopeDeviceRequestRejected,
	checkPostAuthorizeRejected,
} from "./security-request-shape"
import { checkDeleteConsentDisabled, checkSmuggledJsonResource } from "./security-web"
import type { SecurityEvidence } from "./types"

/** Every case the two independent security reviews reproduced against `wrangler dev --local`. */
export async function runSecurityChecks(
	session: Session,
	scratch: string,
): Promise<SecurityEvidence> {
	return {
		paddedGrantTypeRejected: await checkPaddedGrantType(session, scratch),
		revokeBeforeRedemptionHolds: await checkRevokeBeforeRedemption(session, scratch),
		dashedUserCodeCreatesConsent: await checkDashedUserCode(session, scratch),
		deleteConsentPathDisabled: await checkDeleteConsentDisabled(session),
		oldTokenNotRevivedByNewApproval: await checkOldTokenNotRevived(session, scratch),
		expiredDeviceCodePollCreatesNoConsent: await checkExpiredPollCreatesNoConsent(session, scratch),
		smuggledJsonResourceArrayRejected: await checkSmuggledJsonResource(session, scratch),
		reapprovalAfterExpiryWorks: await checkReapprovalAfterExpiry(session, scratch),
		revokeKillsPendingAuthCode: await checkRevokeKillsPendingAuthCode(session, scratch),
		revokeHoldsWithManyVerificationRows: await checkRevokeHoldsWithManyVerificationRows(
			session,
			scratch,
		),
		deviceCodeContentTypeSmugglingRejected: await checkDeviceCodeContentTypeSmugglingRejected(
			session,
			scratch,
		),
		postAuthorizeRejected: await checkPostAuthorizeRejected(session, scratch),
		expiredConsentNeverIssuesCode: await checkExpiredConsentNeverIssuesCode(session, scratch),
		deviceConsentExistsBeforeRedeem: await checkDeviceConsentExistsBeforeRedeem(session, scratch),
		revokeRemovesDuplicateConsents: await checkRevokeRemovesDuplicateConsents(session, scratch),
		emptyScopeDeviceRequestRejected: await checkEmptyScopeDeviceRequestRejected(session, scratch),
		consentScopesAreUnion: await checkConsentScopesAreUnionOnApproval(session, scratch),
	}
}
