<script lang="ts">
import type { Snippet } from "svelte"
import { keepFenced } from "../../client/hosted-fence"

// The hosted Demo draws every Edit control and switches it off here, once, for every page: no page carries its own copy.
let { children }: { children: Snippet } = $props()
let root: HTMLElement | undefined = $state()

$effect(() => {
	if (root === undefined) return undefined
	return keepFenced(root)
})
</script>

<div class="contents" bind:this={root}>{@render children()}</div>
