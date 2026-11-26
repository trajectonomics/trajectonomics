<script lang="ts">
import type { FlatClaimNoteParts } from "../../lib/view/tax-settings/flat-claims"

interface Props {
	/** Why the flat claims wait, with the command it names set in code, not backticks. */
	note: FlatClaimNoteParts
}

let { note }: Props = $props()
</script>

<p class="text-sm text-foreground">{note.before}<code>{note.command}</code>{note.after}</p>
