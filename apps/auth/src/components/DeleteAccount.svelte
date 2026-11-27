<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { tick } from "svelte"
import { deleteAccount, signOut } from "../client/auth"
import { AuthRequestError } from "../client/errors"
import { dictionaryFor, type Language, pagePath } from "../lib/language"

let {
	language,
	email,
	onfailed,
}: {
	language: Language
	email: string
	onfailed: () => void
} = $props()
const words = $derived(dictionaryFor(language))
let typed = $state("")
let busy = $state(false)
let message = $state("")
let alert: HTMLParagraphElement | undefined = $state()
const matches = $derived(
	typed.trim() !== "" && typed.trim().toLowerCase() === email.trim().toLowerCase(),
)

async function remove(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	if (!matches) return
	busy = true
	message = ""
	try {
		await deleteAccount()
		window.location.assign(`${pagePath(language, "sign-in")}?deleted=1`)
	} catch (error) {
		// A stale sign-in is recoverable on this page. Any other failure leaves a session that must
		// not keep acting signed in, so the page signs out and shows only the message.
		if (error instanceof AuthRequestError && error.code === "SESSION_EXPIRED") {
			message = words.accountDeleteExpired
			busy = false
			await tick()
			alert?.focus()
			return
		}
		try {
			await signOut()
		} catch {
			// The session may already be gone; either way the account page is no longer reachable.
		}
		onfailed()
	}
}
</script>

<section class="danger-zone" aria-labelledby="delete-heading">
	<h2 class="section-title" id="delete-heading">{words.accountDeleteHeading}</h2>
	<p>{words.accountDeleteWarning}</p>
	<form class="form" onsubmit={remove}>
		<label class="field-label" for="delete-email">{words.accountDeleteEmailLabel}</label>
		<input
			id="delete-email"
			class="field-input"
			type="email"
			bind:value={typed}
			autocomplete="off"
			disabled={busy}
		/>
		<button class="button button-danger" type="submit" disabled={!matches || busy}>
			{words.accountDeleteButton}
		</button>
	</form>
	{#if message !== ""}
		<p class="form-message" role="alert" tabindex="-1" bind:this={alert}>{message}</p>
	{/if}
</section>
