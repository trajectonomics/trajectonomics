import type { Session } from "./http"
import { checkExpiredPollCreatesNoConsent, checkOldTokenNotRevived } from "./security-consent"
import {
	checkDashedUserCode,
	checkPaddedGrantType,
	checkRevokeBeforeRedemption,
} from "./security-device"
import { checkReapprovalAfterExpiry, checkRevokeKillsPendingAuthCode } from "./security-expiry"
import { checkDeleteConsentDisabled, checkSmuggledJsonResource } from "./security-web"
import type { SecurityEvidence } from "./types"

/** The nine cases the independent security review reproduced against `wrangler dev --local`. */
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
	}
}
