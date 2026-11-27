import type { LegalContent } from "./legal"
import { SOURCE_URL } from "./site"

/** The terms page's English text: the official version. */
export const TERMS_EN: LegalContent = Object.freeze({
	updated: "27 November 2026",
	sections: [
		{
			heading: "The service",
			body: [
				"The Trajectonomics account service is free. It signs you in and lets apps you approve use your account.",
			],
		},
		{
			heading: "As is",
			body: [
				"The service is provided as is, without a warranty. We try to keep it available and correct, but we do not promise it will never fail.",
			],
		},
		{
			heading: "Your account",
			body: [
				"Keep your email and passkeys secure. You are responsible for what happens through your account.",
			],
		},
		{
			heading: "The code",
			body: ["The service's code is open source under AGPL-3.0-only. Read it here:"],
			link: { text: "github.com/trajectonomics/trajectonomics", href: SOURCE_URL },
		},
		{
			heading: "Changes",
			body: ["We may change these terms. The date above says when this text last changed."],
		},
	],
})
