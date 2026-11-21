<script lang="ts">
import { formatArgv } from "../../lib/format"

interface Props {
	/** The argv of the Read a figure came from. Shown as the command a person could paste. */
	argv: readonly string[]
}

let { argv }: Props = $props()
</script>

<details class="text-sm">
	<summary class="cursor-pointer text-muted-foreground hover:text-foreground">Show the command</summary>
	<pre class="mt-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground"><code>{formatArgv(argv)}</code></pre>
</details>
