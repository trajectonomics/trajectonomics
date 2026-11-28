<script lang="ts">
// biome-ignore-all lint/correctness/noUnusedImports: Biome does not read a Svelte template, so it cannot see the imports it renders.
// biome-ignore-all lint/correctness/noUnusedVariables: Biome does not read a Svelte template, so it cannot see these.
import type { SessionUser } from "../lib/api-types"

let { user }: { user: SessionUser } = $props()
const initial = $derived(user.name.trim().charAt(0).toUpperCase() || "?")
</script>

<section class="identity">
	{#if user.image}
		<img
			class="identity-avatar"
			src={user.image}
			alt=""
			width="64"
			height="64"
			referrerpolicy="no-referrer"
		/>
	{:else}
		<span class="identity-avatar identity-initial" aria-hidden="true">{initial}</span>
	{/if}
	<div>
		<h1 class="page-title">{user.name}</h1>
		<p class="identity-email">{user.email}</p>
	</div>
</section>
