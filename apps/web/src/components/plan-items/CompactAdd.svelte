<script lang="ts">
import { disabledTitle } from "../hosted/message"

interface Props {
	/** What the card adds, in the page's noun: "income", "expense" or "account". */
	noun: string
	/** Whether the page may change the plan: a Demo, or a visitor's hosted copy, may not. */
	editable: boolean
	onOpen: () => void
}

/** The dashed last cell of a compact list: it opens the add form in the drawer. */
let { noun, editable, onOpen }: Props = $props()
</script>

<li class="min-w-0">
	<button
		type="button"
		aria-haspopup="dialog"
		onclick={onOpen}
		disabled={!editable}
		title={editable ? undefined : disabledTitle(`Add ${noun}`)}
		class="h-full w-full rounded-lg border border-dashed border-border bg-card p-3 text-left text-sm text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
	>
		+ Add {noun}
	</button>
</li>
