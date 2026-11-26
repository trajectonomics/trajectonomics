<script lang="ts">
import type { HashView } from "../../lib/view/projection/statement"

interface Props {
	hash: HashView
}

/** A content hash: its digest in twelve characters, and the full hash beside it. */
let { hash }: Props = $props()
</script>

<span class="block">
	<code class="font-mono">{hash.short}</code>
	<code class="mt-1 block break-all font-mono text-xs text-muted-foreground">{hash.full}</code>
</span>
