<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { untrack } from "svelte"
import { saveConsent } from "../client/auth"
import type { MarketingConsent } from "../lib/api-types"
import { dictionaryFor, type Language } from "../lib/language"

let { language, initial }: { language: Language; initial: MarketingConsent | null } = $props()
const words = $derived(dictionaryFor(language))
let optedIn = $state(untrack(() => initial?.optedIn ?? false))
let busy = $state(false)
let message = $state("")

async function toggle(next: boolean): Promise<void> {
	const previous = optedIn
	optedIn = next
	busy = true
	message = ""
	try {
		const saved = await saveConsent(next, "account")
		optedIn = saved?.optedIn ?? next
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
			checked={optedIn}
			disabled={busy}
			onchange={(event) => toggle(event.currentTarget.checked)}
		/>
		<span>{optedIn ? words.accountEmailUpdatesOn : words.accountEmailUpdatesOff}</span>
	</label>
	<p class="account-note" role="status" aria-live="polite">{message}</p>
</section>
