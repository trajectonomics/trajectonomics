<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { untrack } from "svelte"
import { saveConsent } from "../client/auth"
import type { MarketingConsent } from "../lib/api-types"
import { consentWording } from "../lib/consent-wording"
import { dictionaryFor, type Language } from "../lib/language"

let { language, initial }: { language: Language; initial: MarketingConsent | null } = $props()
const words = $derived(dictionaryFor(language))
let optedIn = $state(untrack(() => initial?.optedIn ?? false))
let wordingVersion = $state(untrack(() => initial?.wordingVersion ?? ""))
let busy = $state(false)
let message = $state("")
// The sentence is the one the stored version stands for, not today's wording.
const agreed = $derived(wordingVersion === "" ? "" : consentWording(language, wordingVersion))

async function toggle(next: boolean): Promise<void> {
	const previous = optedIn
	optedIn = next
	busy = true
	message = ""
	try {
		const saved = await saveConsent(next, "account", language)
		optedIn = saved?.optedIn ?? next
		if (saved !== null) wordingVersion = saved.wordingVersion
	} catch {
		optedIn = previous
		message = words.accountEmailUpdatesError
	} finally {
		busy = false
	}
}
</script>

<section class="account-section" aria-labelledby="email-heading">
	<h2 class="section-title" id="email-heading">{words.accountEmailUpdates}</h2>
	<label class="switch">
		<input
			type="checkbox"
			role="switch"
			aria-label={words.accountEmailUpdates}
			aria-describedby="email-wording"
			checked={optedIn}
			disabled={busy}
			onchange={(event) => toggle(event.currentTarget.checked)}
		/>
		<span>{optedIn ? words.accountEmailUpdatesOn : words.accountEmailUpdatesOff}</span>
	</label>
	{#if agreed !== ""}
		<p class="account-wording" id="email-wording">
			<span class="account-wording-label">{words.accountEmailUpdatesAgreed}</span>
			{agreed}
		</p>
	{/if}
	<p class="account-note" role="status" aria-live="polite">{message}</p>
</section>
