<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { onMount } from "svelte"
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

onMount(() => {
	void load()
})

async function load(): Promise<void> {
	view = "loading"
	try {
		const session = await ensureSignedIn(language)
		if (session === null) return
		if (!(await ensureConsent(language))) return
		const [state, grantList, passkeyList] = await Promise.all([
			getConsent(),
			listGrants(),
			listPasskeys(),
		])
		user = session.user
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
	try {
		await signOut()
	} finally {
		window.location.assign(pagePath(language, "sign-in"))
	}
}
</script>

{#if view === "failed"}
	<LoadFailure message={words.accountLoadError} retryLabel={words.loadRetry} onretry={load} />
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
		</div>
		<DeleteAccount {language} email={user.email} />
	</div>
{/if}
