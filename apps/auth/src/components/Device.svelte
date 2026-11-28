<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { onMount } from "svelte"
import { type DeviceLookup, enterDevice, lookUpDevice } from "../client/device"
import { approveDevice, denyDevice } from "../client/oauth"
import { dictionaryFor, type Language } from "../lib/language"
import { type ScopeLine } from "../lib/scopes"
import DeviceCodeForm from "./DeviceCodeForm.svelte"
import DeviceReview from "./DeviceReview.svelte"
import DeviceStatus from "./DeviceStatus.svelte"
import LoadFailure from "./LoadFailure.svelte"
import Loading from "./Loading.svelte"

let { language }: { language: Language } = $props()
const words = $derived(dictionaryFor(language))
type View = "loading" | "enter" | "review" | "approved" | "denied" | "failed"
type Review = {
	code: string
	shown: string
	email: string
	clientName: string
	lines: readonly ScopeLine[]
}
let view = $state<View>("loading")
let code = $state("")
let message = $state("")
let busy = $state(false)
/** The signed-in address, kept from the session read so every review can name it. */
let email = $state("")
let review = $state<Review>({ code: "", shown: "", email: "", clientName: "", lines: [] })

onMount(() => {
	void load()
})

function showReview(lookup: DeviceLookup & { kind: "review" }, address: string): void {
	review = { ...lookup, email: address }
	code = lookup.code
	message = ""
	view = "review"
}

async function load(): Promise<void> {
	view = "loading"
	const entry = await enterDevice(language)
	if (entry.kind === "stop") return
	if (entry.kind === "failed") view = "failed"
	else if (entry.kind === "enter") {
		email = entry.email
		view = "enter"
		if (entry.reason === "expired") message = words.deviceExpired
		else if (entry.reason === "invalid") message = words.deviceInvalid
	} else if (entry.kind === "status") view = entry.status
	else showReview(entry, entry.email)
}

async function submit(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	busy = true
	const outcome = await lookUpDevice(code)
	busy = false
	if (outcome.kind === "review") showReview(outcome, email)
	else if (outcome.kind === "failed") view = "failed"
	else if (outcome.kind === "status") view = outcome.status
	else {
		view = "enter"
		message = outcome.reason === "expired" ? words.deviceExpired : words.deviceInvalid
	}
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

{#if view === "failed"}
	<LoadFailure message={words.deviceError} retryLabel={words.loadRetry} onretry={load} />
{:else if view === "loading"}
	<Loading title={words.deviceTitle} text={words.deviceLoading} />
{:else if view === "enter"}
	<DeviceCodeForm {language} bind:code {busy} {message} onsubmit={submit} />
{:else if view === "review"}
	<DeviceReview
		{language}
		code={review.shown}
		email={review.email}
		clientName={review.clientName}
		lines={review.lines}
		{busy}
		{message}
		onapprove={() => decide(true)}
		ondeny={() => decide(false)}
	/>
{:else}
	<DeviceStatus {language} approved={view === "approved"} />
{/if}
