<script lang="ts">
import PreferenceControls from "../shell/PreferenceControls.svelte"
</script>

<!-- The Display settings: the switches the top bar's Display options drawer held (#927). The page needs no Snapshot. -->
<section aria-labelledby="page-title" class="max-w-md space-y-6">
	<header class="flex items-baseline justify-between gap-3">
		<h1 id="page-title" class="text-xl font-semibold tracking-tight">Display</h1>
	</header>
	<PreferenceControls />
</section>
