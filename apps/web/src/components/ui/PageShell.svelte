<script lang="ts">
import type { Snippet } from "svelte"
import { currentPathname } from "../../client/location.svelte.js"
import { currentSnapshot } from "../../client/snapshot.svelte.js"
import type { Snapshot } from "../../lib/contract"
import PageFrame from "./PageFrame.svelte"

interface Props {
	/** The page's heading, such as "Net worth". */
	title: string
	/** Renders the page from the ready Snapshot. */
	children: Snippet<[Snapshot]>
	/** Decoration placed beside the heading, such as the Overview's mascot. */
	leading?: Snippet | undefined
	/** A control placed at the heading's right, such as a link the page offers besides its body. */
	actions?: Snippet | undefined
}

let { title, children, leading, actions }: Props = $props()
</script>

<PageFrame {title} {leading} state={currentSnapshot()} pathname={currentPathname()} {children} {actions} />
