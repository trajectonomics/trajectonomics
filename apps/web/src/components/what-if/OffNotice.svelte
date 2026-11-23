<script lang="ts">
interface Props {
	off: boolean
}

/** Says an item is switched off in the what-if, in words, so the dimmed card never relies on dimming alone. */
let { off }: Props = $props()
</script>

{#if off}
	<p class="mt-1 text-sm font-medium">Off in this what-if</p>
{/if}
