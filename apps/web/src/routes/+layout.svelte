<script lang="ts">
import "../styles/global.css"
import mark from "@trajectonomics/brand/current/logo/mark.svg?raw"
import { onMount, type Snippet } from "svelte"
import { page } from "$app/state"
import { loadSnapshot } from "../client/snapshot.svelte.js"
import { brandArtwork } from "../components/shell/brand-artwork"
import PreferenceControls from "../components/shell/PreferenceControls.svelte"
import SiteBrand from "../components/shell/SiteBrand.svelte"
import SiteNavLinks from "../components/shell/SiteNavLinks.svelte"
import SnapshotStatus from "../components/shell/SnapshotStatus.svelte"

let { children }: { children: Snippet } = $props()
const artwork = brandArtwork(mark)

// The one read of the Snapshot for the whole visit. Client-side navigation keeps this layout mounted.
onMount(() => {
	loadSnapshot(page.url.search)
})
</script>

<header class="border-b border-border">
	<div
		class="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6"
	>
		<SiteBrand {artwork} />
		<PreferenceControls />
	</div>
	<div class="mx-auto w-full max-w-6xl px-4 sm:px-6">
		<SnapshotStatus />
	</div>
	<div class="border-t border-border">
		<div class="mx-auto w-full max-w-6xl px-4 sm:px-6">
			<SiteNavLinks current={page.url.pathname} />
		</div>
	</div>
</header>
<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
	{@render children()}
</main>
<footer class="border-t border-border">
	<p class="mx-auto w-full max-w-6xl px-4 py-4 text-sm text-muted-foreground sm:px-6">
		Every figure is a traj result. The Dashboard computes nothing.
	</p>
</footer>
