<script lang="ts">
import type { Snippet } from "svelte"
import HostedFence from "../components/hosted/HostedFence.svelte"
import HostedNotice from "../components/hosted/HostedNotice.svelte"
import Layout from "../routes/+layout.svelte"

// The hosted build's root layout: the loopback layout, with the notice above each page and the fence around the whole.
let { children }: { children: Snippet } = $props()
</script>

{#snippet page()}
	<HostedNotice />
	{@render children()}
{/snippet}

<HostedFence>
	<Layout children={page} />
</HostedFence>
