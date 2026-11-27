/** The account page's words: identity, apps, passkeys, email updates, sign out and deletion. */
export interface AccountWords {
	readonly accountTitle: string
	readonly accountDescription: string
	readonly accountEmailUpdates: string
	readonly accountEmailUpdatesOn: string
	readonly accountEmailUpdatesOff: string
	readonly accountEmailUpdatesError: string
	readonly accountDevices: string
	readonly accountNoDevices: string
	readonly accountApprovedOn: string
	readonly accountRevoke: string
	readonly accountRevoked: string
	readonly accountRevokeError: string
	readonly accountPasskeys: string
	readonly accountNoPasskeys: string
	readonly accountPasskeyName: string
	readonly accountAddPasskey: string
	readonly accountRemove: string
	readonly accountPasskeyAdded: string
	readonly accountPasskeyError: string
	readonly accountPasskeyRemoved: string
	readonly accountPasskeyRemoveError: string
	readonly accountSignOut: string
	readonly accountDeleteHeading: string
	readonly accountDeleteWarning: string
	readonly accountDeleteEmailLabel: string
	readonly accountDeleteButton: string
	readonly accountDeleteExpired: string
	readonly accountDeleteError: string
	readonly accountLoadError: string
	readonly accountLoading: string
}
