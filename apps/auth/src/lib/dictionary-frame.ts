/** The shared frame, footer, legal titles and root redirect words every page shows. */
export interface FrameWords {
	readonly nativeName: string
	readonly languageName: string
	readonly languageSwitchLabel: string
	readonly dateLocale: string
	readonly skipLink: string
	readonly homeLabel: string
	readonly accountMarker: string
	readonly languageMenuLabel: string
	readonly siteName: string
	readonly loading: string

	readonly footerPrivacy: string
	readonly footerTerms: string
	readonly footerContact: string
	readonly footerSource: string
	readonly footerLicence: string

	readonly privacyTitle: string
	readonly privacyDescription: string
	readonly termsTitle: string
	readonly termsDescription: string
	readonly legalOfficialNote: string
	readonly legalUpdated: string

	readonly redirectDescription: string
	readonly redirectContinue: string
}
