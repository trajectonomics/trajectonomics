<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { onMount, tick } from "svelte"
import { listGrants, listPasskeys } from "../client/account"
import { getConsent, signOut } from "../client/auth"
import { ensureConsent, ensureSignedIn } from "../client/guard"
import type { Grant, MarketingConsent, Passkey, SessionUser } from "../lib/api-types"
import { dictionaryFor, type Language, pagePath } from "../lib/language"
import AccountIdentity from "./AccountIdentity.svelte"
import DeleteAccount from "./DeleteAccount.svelte"
import EmailUpdates from "./EmailUpdates.svelte"
import Grants from "./Grants.svelte"
import LoadFailure from "./LoadFailure.svelte"
import Loading from "./Loading.svelte"
import Passkeys from "./Passkeys.svelte"

let { language }: { language: Language } = $props()
const words = $derived(dictionaryFor(language))
let user = $state<SessionUser | null>(null)
let consent = $state<MarketingConsent | null>(null)
let grants = $state<readonly Grant[]>([])
let passkeys = $state<readonly Passkey[]>([])
let view = $state<"loading" | "ready" | "failed">("loading")
let signOutError = $state("")
/** Set when a deletion failed after the session ended, so no account control is offered again. */
let ended = $state("")
let endedAlert: HTMLParagraphElement | undefined = $state()

onMount(() => {
	void load()
})

async function load(): Promise<void> {
	view = "loading"
	try {
		const signedIn = await ensureSignedIn(language)
		if (signedIn === null) return
		if (!(await ensureConsent(language))) return
		const [state, grantList, passkeyList] = await Promise.all([
			getConsent(),
			listGrants(),
			listPasskeys(),
		])
		user = signedIn.session.user
		consent = state
		grants = grantList.grants
		passkeys = passkeyList
		view = "ready"
	} catch {
		// Nothing on the page is painted from a half-read answer: a failed read is its own state.
		view = "failed"
	}
}

async function out(): Promise<void> {
	signOutError = ""
	try {
		await signOut()
	} catch {
		// A failed sign-out leaves the session in place; staying on the page is the honest answer.
		signOutError = words.accountSignOutError
		return
	}
	window.location.assign(pagePath(language, "sign-in"))
}

/** A failed deletion ends the session, so only its message is left to show. */
function deleteFailed(): void {
	ended = words.accountDeleteError
	void tick().then(() => endedAlert?.focus())
}
</script>

{#if view === "failed"}
	<LoadFailure message={words.accountLoadError} retryLabel={words.loadRetry} onretry={load} />
{:else if ended !== ""}
	<div class="panel">
		<h1 class="page-title">{words.accountTitle}</h1>
		<p class="form-message" role="alert" tabindex="-1" bind:this={endedAlert}>{ended}</p>
		<p class="legal-links"><a href={pagePath(language, "sign-in")}>{words.signInTitle}</a></p>
	</div>
{:else if view === "loading" || user === null}
	<Loading title={words.accountTitle} text={words.loading} />
{:else}
	<div class="account">
		<AccountIdentity {user} />
		<EmailUpdates {language} initial={consent} />
		<Grants {language} initial={grants} />
		<Passkeys {language} initial={passkeys} />
		<div class="account-section">
			<button class="button button-secondary" type="button" onclick={out}>{words.accountSignOut}</button>
			{#if signOutError !== ""}
				<p class="form-message" role="alert">{signOutError}</p>
			{/if}
		</div>
		<DeleteAccount {language} email={user.email} onfailed={deleteFailed} />
	</div>
{/if}
