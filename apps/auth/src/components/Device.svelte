<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { onMount } from "svelte"
import { ensureConsent, ensureSignedIn } from "../client/guard"
import { approveDevice, denyDevice, getPublicClient, lookupDevice } from "../client/oauth"
import { dictionaryFor, type Language } from "../lib/language"
import { type ScopeLine, scopeLines, scopeText } from "../lib/scopes"
import { normalizeUserCode } from "../lib/user-code"

let { language }: { language: Language } = $props()
const words = $derived(dictionaryFor(language))
type View = "loading" | "enter" | "review" | "approved" | "denied"
let view = $state<View>("loading")
let code = $state("")
let clientName = $state("")
let lines = $state<readonly ScopeLine[]>([])
let message = $state("")
let busy = $state(false)

onMount(async () => {
	const session = await ensureSignedIn(language)
	if (session === null) return
	if (!(await ensureConsent(language))) return
	const fromQuery = new URLSearchParams(window.location.search).get("user_code")?.trim() ?? ""
	if (fromQuery === "") {
		view = "enter"
		return
	}
	code = fromQuery
	await check(fromQuery)
})

async function check(value: string): Promise<void> {
	const normalized = normalizeUserCode(value)
	if (normalized === "") {
		view = "enter"
		message = words.deviceInvalid
		return
	}
	busy = true
	message = ""
	try {
		const result = await lookupDevice(normalized)
		if (result.status === "approved" || result.status === "denied") {
			view = result.status
			return
		}
		if (result.client_id === undefined) {
			view = "enter"
			message = words.deviceInvalid
			return
		}
		code = normalized
		lines = scopeLines(result.scope)
		clientName = (await nameOf(result.client_id)) ?? ""
		view = "review"
	} catch (error) {
		view = "enter"
		message =
			error instanceof Error && /expired/i.test(error.message)
				? words.deviceExpired
				: words.deviceInvalid
	} finally {
		busy = false
	}
}

async function nameOf(clientId: string): Promise<string | undefined> {
	try {
		return (await getPublicClient(clientId)).client_name
	} catch {
		return undefined
	}
}

async function submit(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	await check(code)
}

async function decide(approve: boolean): Promise<void> {
	busy = true
	message = ""
	try {
		if (approve) await approveDevice(code)
		else await denyDevice(code)
		view = approve ? "approved" : "denied"
	} catch {
		message = words.deviceError
	} finally {
		busy = false
	}
}
</script>

<div class="panel">
	<h1 class="page-title">{words.deviceTitle}</h1>
	{#if view === "loading"}
		<p class="muted" aria-live="polite">{words.deviceLoading}</p>
	{:else if view === "enter"}
		<form class="form" onsubmit={submit}>
			<label class="field-label" for="device-code">{words.deviceCodeLabel}</label>
			<input
				id="device-code"
				class="field-input"
				bind:value={code}
				autocomplete="one-time-code"
				autocapitalize="characters"
				spellcheck={false}
				disabled={busy}
			/>
			<button class="button button-primary" type="submit" disabled={busy}>{words.deviceContinue}</button>
		</form>
	{:else if view === "review"}
		<p class="device-app">{clientName === "" ? words.deviceUnknownApp : clientName}</p>
		<p class="device-wants">{words.deviceWants}</p>
		<ul class="scope-list">
			{#each lines as line (line.scope)}
				<li>{scopeText(line, words)}</li>
			{/each}
		</ul>
		<div class="button-row">
			<button class="button button-primary" type="button" onclick={() => decide(true)} disabled={busy}>
				{words.deviceApprove}
			</button>
			<button class="button button-secondary" type="button" onclick={() => decide(false)} disabled={busy}>
				{words.deviceDeny}
			</button>
		</div>
	{:else if view === "approved"}
		<p class="status status-done" role="status"><span aria-hidden="true">✓</span> {words.deviceApproved}</p>
	{:else}
		<p class="status status-denied" role="status"><span aria-hidden="true">×</span> {words.deviceDenied}</p>
	{/if}
	{#if message !== ""}
		<p class="form-message" role="alert">{message}</p>
	{/if}
</div>
