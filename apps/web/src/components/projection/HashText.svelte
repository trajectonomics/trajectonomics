<script lang="ts">
import type { HashView } from "../../lib/view/projection/statement"

interface Props {
	hash: HashView
}

/** A content hash in twelve characters, with the full hash one disclosure away. */
let { hash }: Props = $props()
</script>

<span class="block">
	<code class="font-mono">{hash.short}</code>
	<details class="mt-1 text-xs">
		<summary class="cursor-pointer text-muted-foreground hover:text-foreground">Full hash</summary>
		<code class="mt-1 block break-all font-mono">{hash.full}</code>
	</details>
</span>
