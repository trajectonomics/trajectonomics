<script lang="ts">
import type { Snippet } from "svelte"
import { formatArgv } from "../../lib/format"

interface Props {
	/** The result this provenance belongs to, which names the disclosure for a screen reader. */
	name: string
	/** The argv of each Read a figure came from, in the order shown, as commands a person could paste. */
	commands: readonly (readonly string[])[]
	/** Raw provenance a result states beside its command, such as hashes or the figures behind a ratio. */
	details?: Snippet
}

let { name, commands, details }: Props = $props()
</script>

<details class="text-sm">
	<summary class="cursor-pointer text-muted-foreground hover:text-foreground" aria-label={`Details of ${name}`}>Details</summary>
	{#each commands as command, index (index)}
		<pre class="mt-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground"><code>{formatArgv(command)}</code></pre>
	{/each}
	{@render details?.()}
</details>
