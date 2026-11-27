export type DeviceCodeResponse = {
	device_code: string
	user_code: string
	verification_uri: string
	verification_uri_complete: string
	expires_in: number
	interval: number
}

export type TokenResponse = {
	access_token: string
	refresh_token?: string
	expires_in: number
	token_type: string
	scope: string
	id_token?: string
	[key: string]: unknown
}

export type RequestResult = {
	status: number
	body: Record<string, unknown>
}

export type Grant = {
	id: string
	clientId: string
	clientName: string
	createdAt: string | null
	scopes: string[]
	resources: string[]
}

export type DeviceCodeInput = {
	scope?: string
	resources?: readonly string[]
}

export type GateEvidence = {
	multiResourceDeviceRequest: { status: number; error: string | null }
	dataIngestForRelay: { status: number; error: string | null }
	refreshWideningFromData: { status: number; error: string | null }
	refreshWideningFromNone: { status: number; error: string | null }
	multiResourceTokenRequest: { status: number; error: string | null }
	refreshAfterRevoke: { status: number; error: string | null }
	refreshPastAbsoluteLifetime: { status: number; error: string | null }
	rateLimitedUserCodeGuesses: boolean
	grantListed: boolean
	grantRevoked: boolean
}

/** The security-review cases from PR #799's fix round, each one a finished boolean. */
export type SecurityEvidence = {
	paddedGrantTypeRejected: boolean
	revokeBeforeRedemptionHolds: boolean
	dashedUserCodeCreatesConsent: boolean
	deleteConsentPathDisabled: boolean
	oldTokenNotRevivedByNewApproval: boolean
	expiredDeviceCodePollCreatesNoConsent: boolean
	smuggledJsonResourceArrayRejected: boolean
	reapprovalAfterExpiryWorks: boolean
	revokeKillsPendingAuthCode: boolean
	revokeHoldsWithManyVerificationRows: boolean
	deviceCodeContentTypeSmugglingRejected: boolean
	postAuthorizeRejected: boolean
	expiredConsentNeverIssuesCode: boolean
	deviceConsentExistsBeforeRedeem: boolean
	revokeRemovesDuplicateConsents: boolean
	emptyScopeDeviceRequestRejected: boolean
	consentScopesAreUnion: boolean
}
