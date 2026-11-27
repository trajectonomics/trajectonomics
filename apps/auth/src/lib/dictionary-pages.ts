/** The sign-in, first-sign-in, device and consent words, plus the scope descriptions. */
export interface PageWords {
	readonly signInTitle: string
	readonly signInDescription: string
	readonly signInGoogle: string
	readonly signInGithub: string
	readonly signInPasskey: string
	readonly signInPrivacy: string
	readonly signInTerms: string
	readonly signInError: string
	readonly signInPasskeyError: string
	readonly signInNoScript: string
	readonly signInDeleted: string

	readonly welcomeTitle: string
	readonly welcomeDescription: string
	readonly welcomeCheckbox: string
	readonly welcomeContinue: string
	readonly welcomeError: string
	readonly welcomePrivacy: string

	readonly deviceTitle: string
	readonly deviceDescription: string
	readonly deviceCodeLabel: string
	readonly deviceContinue: string
	readonly deviceWants: string
	readonly deviceApprove: string
	readonly deviceDeny: string
	readonly deviceApproved: string
	readonly deviceDenied: string
	readonly deviceInvalid: string
	readonly deviceExpired: string
	readonly deviceError: string
	readonly deviceLoading: string
	readonly deviceUnknownApp: string

	readonly consentHeading: (app: string) => string
	readonly consentDescription: string
	readonly consentWants: string
	readonly consentAllow: string
	readonly consentDeny: string
	readonly consentInvalid: string
	readonly consentError: string
	readonly consentUnknownApp: string

	readonly scopeOpenId: string
	readonly scopeProfile: string
	readonly scopeEmail: string
	readonly scopeOffline: string
	readonly scopeDataIngest: string
}
