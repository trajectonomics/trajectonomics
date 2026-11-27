import { type LegalContent, PRIVACY_CONTACT } from "./legal"

/** The privacy page's English text: the official version. */
export const PRIVACY_EN: LegalContent = Object.freeze({
	updated: "27 November 2026",
	sections: [
		{
			heading: "Who is responsible",
			body: [
				"The Trajectonomics account service at auth.trajectonomics.com is run by Trajectonomics. It decides what is collected here and why.",
			],
		},
		{
			heading: "What we keep, and why",
			body: [
				"Each item exists for the reason beside it. We do not sell it, and we do not use it for advertising.",
			],
			items: [
				"Your account id: the pseudonymous id that ties your data together. The data site keeps it with your usage numbers.",
				"Your email address, name and profile picture from Google or GitHub: to sign you in, and to show you who is signed in.",
				"Passkey public keys: to sign you in with your device. The private key never leaves your device.",
				"Sessions: to keep you signed in until the session expires. Each session records the IP address and the browser user agent it was created from.",
				"Sign-in tokens from Google and GitHub: an access token, a refresh token and an ID token in the account table, used only to sign you in and to read your name, email and picture from the provider.",
				"App connections (OAuth grants): which app you allowed, which permissions it received, and when you approved it.",
				"Marketing consent history: every answer you gave about email updates, the wording you saw, the language you read it in and when. Withdrawing adds a record of the withdrawal; it does not delete the earlier answer.",
				"Short-lived rate-limit counters keyed on your IP address: to stop abuse of the sign-in endpoints. Each row holds your IP address and is deleted when its window is reused, or by the hourly cleanup.",
			],
		},
		{
			heading: "Where it is kept",
			body: [
				"Cloudflare Workers and the D1 database, in the Asia-Pacific region. Cloudflare processes the data for us under its own terms.",
			],
		},
		{
			heading: "The data site",
			body: [
				"The data site at trajectonomics.com/data stores AI usage numbers with only your pseudonymous auth user id. Its web sign-in receives your name and email only when you approve the profile and email permissions on the consent screen for that sign-in. The collector that uploads numbers receives neither.",
			],
		},
		{
			heading: "How long we keep it",
			body: [
				"We keep your account data until you delete your account. Rate-limit counters hold your IP address and are deleted when their window is reused, or by the hourly cleanup.",
				"When you delete your account, your account, sessions, passkeys, app connections and marketing consent history are deleted. The data site is told to remove your pseudonymous id, and that notice is retried until the data site confirms it.",
				"Each deletion notice is kept for 30 days after the data site confirms it, then deleted. A notice the data site has not confirmed is retried for as long as it takes.",
			],
		},
		{
			heading: "Your rights",
			body: [
				"Under Thailand's PDPA and the EU GDPR you can ask for a copy of your data, ask us to correct it, ask us to delete it, withdraw a consent, or object to processing.",
				"You can also complain to the Thai Personal Data Protection Committee (PDPC) or to your local data-protection authority.",
			],
		},
		{
			heading: "Deleting your account",
			body: [
				"Sign in, open the account page, and use Delete account. You type your email to confirm. The deletion is immediate.",
			],
		},
		{
			heading: "Contact",
			body: ["Questions about this page or your data:"],
			link: { text: PRIVACY_CONTACT, href: `mailto:${PRIVACY_CONTACT}` },
		},
	],
})
