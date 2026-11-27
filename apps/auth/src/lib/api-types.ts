/** The shapes the auth endpoints return, as the islands read them. No behaviour lives here. */

export type SessionUser = {
	readonly id: string
	readonly name: string
	readonly email: string
	readonly image?: string | null
}

export type SessionResponse = { readonly user: SessionUser }

export type ConsentSource = "first-sign-in" | "account"

/** The interface language the person answered in. */
export type ConsentLanguage = "en" | "th"

export type MarketingConsent = {
	readonly optedIn: boolean
	readonly wordingVersion: string
	readonly source: ConsentSource
	readonly language: ConsentLanguage
	readonly givenAt: string | null
	readonly withdrawnAt: string | null
}

export type ConsentState = { readonly consent: MarketingConsent | null }

export type Grant = {
	readonly id: string
	readonly clientId: string
	readonly clientName: string
	readonly createdAt: string | null
	readonly scopes: readonly string[]
	readonly resources: readonly string[]
}

export type GrantList = { readonly grants: readonly Grant[] }

export type Passkey = {
	readonly id: string
	readonly name?: string | null
	readonly createdAt?: string | null
}

export type DeviceStatus = "pending" | "approved" | "denied"

export type DeviceLookup = {
	readonly user_code: string
	readonly status: DeviceStatus
	readonly client_id?: string
	readonly scope?: string
}

export type PublicClient = {
	readonly client_id: string
	readonly client_name?: string
}

export type ConsentResult = { readonly redirect: true; readonly url: string }
