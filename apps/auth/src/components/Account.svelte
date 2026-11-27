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
import Passkeys from "./Passkeys.svelte"

let { language }: { language: Language } = $props()
const words = $derived(dictionaryFor(language))
let user = $state<SessionUser | null>(null)
let consent = $state<MarketingConsent | null>(null)
let grants = $state<readonly Grant[]>([])
let passkeys = $state<readonly Passkey[]>([])
let loading = $state(true)
let message = $state("")

onMount(() => {
	void load()
})

async function load(): Promise<void> {
	const session = await ensureSignedIn(language)
	if (session === null) return
	if (!(await ensureConsent(language))) return
	user = session.user
	try {
		const [state, grantList, passkeyList] = await Promise.all([
			getConsent(),
			listGrants(),
			listPasskeys(),
		])
		consent = state
		grants = grantList.grants
		passkeys = passkeyList
	} catch {
		message = words.accountLoadError
	} finally {
		loading = false
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

{#if loading}
	<p class="muted" aria-live="polite">{words.accountLoading}</p>
{:else if user !== null}
	<div class="account">
		<AccountIdentity {user} />
		{#if message !== ""}
			<p class="form-message" role="alert">{message}</p>
		{/if}
		<EmailUpdates {language} initial={consent} />
		<Grants {language} initial={grants} />
		<Passkeys {language} initial={passkeys} />
		<div class="account-section">
			<button class="button button-secondary" type="button" onclick={out}>{words.accountSignOut}</button>
		</div>
		<DeleteAccount {language} email={user.email} />
	</div>
{:else}
	<p class="muted" aria-live="polite">{words.accountLoading}</p>
{/if}
