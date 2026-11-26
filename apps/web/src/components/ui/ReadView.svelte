<script lang="ts" generics="T">
import type { Snippet } from "svelte"
import type { Read } from "../../lib/contract"
import { formatArgv } from "../../lib/format"

interface Props {
	/** The Read to show. A failed Read renders the CLI's own message, hint and code. */
	read: Read<T>
	/** The name of the figure this Read answers, such as "Net worth". Named in an error. */
	label: string
	/** Renders the data of a successful Read. */
	children: Snippet<[T]>
}

let { read, label, children }: Props = $props()
</script>

{#if read.ok}
	{@render children(read.data)}
{:else}
	<div role="alert" class="rounded-lg border border-destructive p-4 text-sm">
		<p class="font-medium">{label} could not be read</p>
		<p class="mt-1" data-cli>{read.error.message}</p>
		{#if read.error.hint}
			<p class="mt-1 text-muted-foreground" data-cli>{read.error.hint}</p>
		{/if}
		<p class="mt-2 text-xs text-muted-foreground">Error code {read.error.code}</p>
		<pre class="mt-2 overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs"><code>{formatArgv(read.argv)}</code></pre>
	</div>
{/if}
