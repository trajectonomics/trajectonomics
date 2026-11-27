<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import { untrack } from "svelte"
import { revokeGrant } from "../client/account"
import type { Grant } from "../lib/api-types"
import { formatDate } from "../lib/dates"
import { dictionaryFor, type Language } from "../lib/language"

let { language, initial }: { language: Language; initial: readonly Grant[] } = $props()
const words = $derived(dictionaryFor(language))
let grants = $state<readonly Grant[]>(untrack(() => [...initial]))
let busyId = $state("")
let message = $state("")

async function revoke(id: string): Promise<void> {
	busyId = id
	message = ""
	try {
		await revokeGrant(id)
		grants = grants.filter((grant) => grant.id !== id)
		message = words.accountRevoked
	} catch {
		message = words.accountRevokeError
	} finally {
		busyId = ""
	}
}
</script>

<section class="account-section" aria-labelledby="devices-heading">
	<h2 class="section-title" id="devices-heading">{words.accountDevices}</h2>
	{#if grants.length === 0}
		<p class="muted">{words.accountNoDevices}</p>
	{:else}
		<ul class="grant-list">
			{#each grants as grant (grant.id)}
				<li class="grant">
					<div>
						<p class="grant-name">{grant.clientName}</p>
						<p class="grant-date">
							{words.accountApprovedOn}
							{formatDate(grant.createdAt, words.dateLocale)}
						</p>
					</div>
					<button
						class="button button-secondary button-small"
						type="button"
						onclick={() => revoke(grant.id)}
						disabled={busyId === grant.id}
						aria-label={`${words.accountRevoke}: ${grant.clientName}`}
					>
						{words.accountRevoke}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	<p class="account-note" role="status" aria-live="polite">{message}</p>
</section>
