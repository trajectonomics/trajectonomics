import { ENGLISH_OPENJOT_FAQ } from "./en-openjot-faq"
import { ENGLISH_OPENJOT_PRIVACY } from "./en-openjot-privacy"
import type { OpenJotDictionary, OpenJotLanguageEntry } from "./openjot-dictionary"

/** The English words of the OpenJot page, ported from the app's own landing page (ADR 0032). */
const ENGLISH_OPENJOT_DICTIONARY: OpenJotDictionary = Object.freeze({
	documentTitle: "OpenJot — free Thai expense tracker for Android",
	description:
		"OpenJot is a free, open-source Android app that reads Thai bank slips and turns them into an expense diary on your phone, with no sign-up.",
	heroEyebrow: "Free · Open source · Android",
	heroHeadingPrefix: "You pay.",
	heroHeadingAccent: "OpenJot jots it down.",
	heroLede:
		"OpenJot reads the payment slips your banking apps save to your phone, then logs and sorts every expense for you. It all happens on your phone: no sign-up, no ads, every feature free.",
	downloadCta: "Download for Android",
	installCta: "How to install",
	requirement: "APK file · Android 7.0 or newer, 64-bit",
	releasesLink: "Releases and checksums",
	inAppTitle: "Opened inside Instagram, LINE or Facebook?",
	inAppText:
		"Tap ⋮ or ⋯ at the top right and choose “Open in browser” before you download. The download works more reliably there.",
	screensEyebrow: "Screens",
	screensHeading: "Inside the app",
	screenCaptions: Object.freeze([
		"Every day, jotted",
		"Where it all went",
		"The home screen in Thai",
		"Adding a record by hand",
	] as const),
	screenAlts: Object.freeze([
		"Home: a timeline of the day's expenses, each with a category",
		"Summary: a donut chart of spending by category, the month's total in the middle",
		"Home in Thai: the same timeline, with the app's labels in Thai",
		"Add record: a form for a new expense, with amount, category, tags and note",
	] as const),
	screensNote: "Screenshots use sample data.",
	featuresEyebrow: "Features",
	featuresHeading: "What OpenJot can do",
	featureTitles: Object.freeze([
		"Reads slips from 20 apps",
		"Sorts itself",
		"Spots your own transfers",
		"Summaries & budgets",
		"Credit card statements",
		"Your data, your way",
	] as const),
	featureCopies: Object.freeze([
		"K PLUS, SCB EASY, Krungthai NEXT, MAKE, TrueMoney, Dime! and more. It reads the slip QR and the Thai text with on-device OCR.",
		"247 built-in merchant rules, from 7-Eleven to BTS. Fix a category once and OpenJot remembers it next time.",
		"Moving money between your own banks isn't spending. OpenJot can tell, and doesn't count it twice.",
		"A donut by category or tag, a 6-month comparison, and budgets that tell you what you can still spend per day.",
		"Import password-protected PDF e-statements from KBank, SCB, KTC, Krungsri, BBL, ttb, UOB and AEON.",
		"Export to CSV or JSON any time. Thai or English, pink or black and orange.",
	] as const),
	...ENGLISH_OPENJOT_PRIVACY,
	installEyebrow: "Install",
	installHeading: "Install in 3 steps",
	installLede:
		"OpenJot isn't on the Play Store yet, so you install the APK file directly. It takes under a minute.",
	stepTitles: Object.freeze([
		"Download the file",
		"Allow the install",
		"Open it and let OpenJot read",
	] as const),
	stepCopies: Object.freeze([
		"Tap the download button. If Chrome says the file might be harmful, tap “Download anyway”. It comes straight from the project's GitHub releases.",
		"Open the finished download. If Android blocks unknown apps, tap Settings, turn on “Allow from this source”, then go back and tap Install.",
		"Allow OpenJot to see your photos, then pull down on the home screen. OpenJot reads the slips in your banking apps' albums and logs them, with no internet needed.",
	] as const),
	installTip: "If Play Protect warns you, tap “More details” → “Install anyway”.",
	updateNote:
		"Updating: download the new file from this page and install it over the old one. Your records stay, because every release is signed with the same key.",
	checkFileText:
		"Every release ships a SHA256SUMS file and is signed with the project's key, CN=MooJot (the app's earlier name), SHA-256 fingerprint",
	checksumsLink: "Check the checksums",
	checkFileWarning: "Don't install an OpenJot APK whose fingerprint is different.",
	...ENGLISH_OPENJOT_FAQ,
	closingHeading: "Let OpenJot start jotting today",
	closingLede: "Free, open source, and every record stays on your phone.",
	ossLink: "Open source · View on GitHub",
})

/** English's OpenJot page: the fallback Language's build path under `openjot/`. */
export const ENGLISH_OPENJOT: OpenJotLanguageEntry = Object.freeze({
	language: "en",
	buildPath: "",
	dictionary: ENGLISH_OPENJOT_DICTIONARY,
})
