<script lang="ts">
import type { Snippet } from "svelte"
import HostedFence from "../components/hosted/HostedFence.svelte"
import HostedNotice from "../components/hosted/HostedNotice.svelte"
import Layout from "../routes/+layout.svelte"

// The hosted build's root layout: the notice above the page, and the loopback layout with the fence around the whole.
let { children }: { children: Snippet } = $props()
</script>

{#snippet page()}
	{@render children()}
{/snippet}

<HostedFence>
	<HostedNotice />
	<Layout children={page} />
</HostedFence>
