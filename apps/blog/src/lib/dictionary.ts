import { EN } from "./dictionary-en"
import { TH } from "./dictionary-th"
import type { Language } from "./languages"
import type { PostType } from "./posts"

/** Every word the Shell and the page's labels show, in one Interface Language. Post text is not here. */
export interface Dictionary {
	/** The Language's name for itself, as the Language menu shows it. */
	readonly nativeName: string
	/** The locale dates are written in. */
	readonly dateLocale: string
	/** The locale an Open Graph card names. */
	readonly ogLocale: string
	/** Each Language's name, written in this Language. */
	readonly languageNames: Readonly<Record<Language, string>>
	readonly skipLink: string
	readonly blogMarker: string
	readonly homeLabel: (siteName: string) => string
	readonly languageMenuLabel: string
	/** The Language menu's short visible label, the Site's own ("EN", "ไทย"). */
	readonly languageSwitchLabel: string
	readonly frontTitle: string
	readonly frontDescription: string
	readonly frontHeading: string
	readonly noPosts: string
	readonly postTitleSuffix: string
	readonly typeLabels: Readonly<Record<PostType, string>>
	readonly minutesRead: (minutes: number) => string
	readonly byline: string
	readonly availableIn: string
	/** The notice a page shows when the Post is not written in the Interface Language. */
	readonly fallbackNotice: (interfaceLanguage: string, shownLanguage: string) => string
	readonly fairPlayBefore: string
	readonly fairPlayLink: string
	readonly fairPlayAfter: string
	readonly footerTagline: string
	readonly footerRead: string
	readonly footerSource: string
	readonly footerHelp: string
	readonly footerBlog: string
	readonly footerDocs: string
	readonly footerSiteHome: string
	readonly footerSourceCode: string
	readonly footerOrganisation: string
	readonly footerReport: string
	readonly footerLicence: string
	readonly footerLicenceLine: (siteName: string) => string
}

/** One Dictionary per Language: a new Interface Language is a new file and an entry here, and nothing more. */
const DICTIONARIES: Readonly<Record<Language, Dictionary>> = Object.freeze({ en: EN, th: TH })

/** The words of one Interface Language. */
export function dictionaryFor(language: Language): Dictionary {
	return DICTIONARIES[language]
}
