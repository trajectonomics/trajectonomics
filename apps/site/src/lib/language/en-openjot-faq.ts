import { OPENJOT_SIGNING_FINGERPRINT } from "../site/openjot"
import type { OpenJotFaqWords } from "./openjot-dictionary"

/** The English FAQ of the OpenJot page, ported from the app's own landing page (ADR 0032). */
export const ENGLISH_OPENJOT_FAQ: OpenJotFaqWords = Object.freeze({
	faqEyebrow: "FAQ",
	faqHeading: "Questions",
	faqQuestions: Object.freeze([
		"What happened to MooJot?",
		"Is installing outside the Play Store safe?",
		"Does it work on iPhone?",
		"Does it need the internet?",
		"Does it cost anything?",
		"How do I update?",
	] as const),
	faqAnswers: Object.freeze([
		"MooJot is now OpenJot, the same app by Trajectonomics. Installing the new version over MooJot keeps every record.",
		`The APK is built by GitHub Actions from the public source code, signed with the project's key, and published with SHA-256 checksums. You can read every line of the code. The key's certificate carries the app's earlier name, CN=MooJot; its SHA-256 fingerprint is ${OPENJOT_SIGNING_FINGERPRINT}. Every future release is signed with this same key, so if the fingerprint differs, don't install it. To check it yourself: apksigner verify --print-certs openjot-android-arm64.apk`,
		"Not yet. OpenJot is Android-only for now: Android 7.0 or newer on a 64-bit phone. Nearly every phone sold since about 2017 is 64-bit.",
		"No. Slip reading, OCR and categories all run on the phone. When you're online, Google's ML Kit, which reads the English text on slips, sends Google usage stats such as your phone model and the app version, never the photo or its text. If you choose to share anonymous usage stats (never your records or amounts), the app also sends them when you're online.",
		"No. There are no ads and no subscription, and it's open source under the MIT license.",
		"Download the new file from this page and install it over the old one. Your records stay.",
	] as const),
})
