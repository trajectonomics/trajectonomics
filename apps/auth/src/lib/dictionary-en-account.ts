import type { Dictionary } from "./dictionary"

/** The account page's words: identity, apps, passkeys, email updates, sign out and deletion. */
export const ENGLISH_ACCOUNT = {
	accountTitle: "Account",
	accountDescription: "Your details, connected apps and passkeys.",
	accountEmailUpdates: "Email updates",
	accountEmailUpdatesOn: "On",
	accountEmailUpdatesOff: "Off",
	accountEmailUpdatesAgreed: "You agreed to:",
	accountEmailUpdatesError: "That change was not saved. Try again.",
	accountDevices: "Devices and apps",
	accountNoDevices: "No app is connected.",
	accountApprovedOn: "Approved",
	accountRevoke: "Revoke",
	accountRevoked: "Revoked.",
	accountRevokeError: "That app was not revoked. Try again.",
	accountRevokeConfirm: "Revoke access?",
	accountPasskeys: "Passkeys",
	accountNoPasskeys: "No passkey yet.",
	accountPasskeyName: "Passkey",
	accountAddPasskey: "Add a passkey",
	accountRemove: "Remove",
	accountRemoveConfirm: "Remove this passkey?",
	accountPasskeyAdded: "Passkey added.",
	accountPasskeyError: "The passkey was not added. Try again.",
	accountPasskeyRemoved: "Passkey removed.",
	accountPasskeyRemoveError: "The passkey was not removed. Try again.",
	accountConfirmCancel: "Cancel",
	accountSignOut: "Sign out",
	accountSignOutError: "You were not signed out. Try again.",
	accountDeleteHeading: "Delete account",
	accountDeleteWarning:
		"This removes your account, your passkeys and every app connection. It cannot be undone.",
	accountDeleteEmailLabel: "Type your email to confirm",
	accountDeleteButton: "Delete my account",
	accountDeleteExpired:
		"Your sign-in is too old for this. Sign out and sign in again, then delete.",
	accountDeleteSignedOut:
		"The account was not deleted. You were signed out; sign in again to try again.",
	accountDeleteRetry: "The account was not deleted. Try again.",
	accountDeleteUnconfirmed:
		"We couldn't confirm whether the account was deleted. Reload this page to check.",
	accountDeleteReload: "Reload",
	accountLoadError: "Some of this did not load. Reload the page.",
} satisfies Partial<Dictionary>
