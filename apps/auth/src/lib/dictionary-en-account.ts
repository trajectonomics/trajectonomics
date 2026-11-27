import type { Dictionary } from "./dictionary"

/** The account page's words: identity, apps, passkeys, email updates, sign out and deletion. */
export const ENGLISH_ACCOUNT = {
	accountTitle: "Account",
	accountDescription: "Your details, connected apps and passkeys.",
	accountEmailUpdates: "Email updates",
	accountEmailUpdatesOn: "On",
	accountEmailUpdatesOff: "Off",
	accountEmailUpdatesError: "That change was not saved. Try again.",
	accountDevices: "Devices and apps",
	accountNoDevices: "No app is connected.",
	accountApprovedOn: "Approved",
	accountRevoke: "Revoke",
	accountRevoked: "Revoked.",
	accountRevokeError: "That app was not revoked. Try again.",
	accountPasskeys: "Passkeys",
	accountNoPasskeys: "No passkey yet.",
	accountPasskeyName: "Passkey",
	accountAddPasskey: "Add a passkey",
	accountRemove: "Remove",
	accountPasskeyAdded: "Passkey added.",
	accountPasskeyError: "The passkey was not added. Try again.",
	accountPasskeyRemoved: "Passkey removed.",
	accountPasskeyRemoveError: "The passkey was not removed. Try again.",
	accountSignOut: "Sign out",
	accountDeleteHeading: "Delete account",
	accountDeleteWarning:
		"This removes your account, your passkeys and every app connection. It cannot be undone.",
	accountDeleteEmailLabel: "Type your email to confirm",
	accountDeleteButton: "Delete my account",
	accountDeleteExpired:
		"Your sign-in is too old for this. Sign out and sign in again, then delete.",
	accountDeleteError: "The account was not deleted. Try again.",
	accountLoadError: "Some of this did not load. Reload the page.",
	accountLoading: "Loading…",
} satisfies Partial<Dictionary>
