<script lang="ts">
import type { Snippet } from "svelte"
import { formatArgv } from "../../lib/format"

interface Props {
	/** The argv of the Read a figure came from. Shown as the command a person could paste. */
	argv: readonly string[]
	/** Raw provenance a result states beside its command, such as hashes or the figures behind a ratio. */
	details?: Snippet
}

let { argv, details }: Props = $props()
</script>

<details class="text-sm">
	<summary class="cursor-pointer text-muted-foreground hover:text-foreground">Details</summary>
	<pre class="mt-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground"><code>{formatArgv(argv)}</code></pre>
	{@render details?.()}
</details>
