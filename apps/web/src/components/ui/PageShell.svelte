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
}

let { title, children }: Props = $props()
</script>

<PageFrame {title} state={currentSnapshot()} pathname={currentPathname()} {children} />
