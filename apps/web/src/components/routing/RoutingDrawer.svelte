<script lang="ts">
import type { Snippet } from "svelte"
import Drawer from "../ui/Drawer.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"

interface Props {
	/** Whether the drawer is open. */
	open: boolean
	title: string
	onClose: () => void
	children: Snippet
}

let { open, title, onClose, children }: Props = $props()
</script>

<!-- The right-side drawer of a section: one form, which saves one Edit or tries one value in the What-if session. -->
<Drawer {open} {title} {onClose}>
	<StaleNotice />
	{#if open}{@render children()}{/if}
</Drawer>
