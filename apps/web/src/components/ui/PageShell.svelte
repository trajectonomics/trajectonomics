<script lang="ts">
import type { Snippet } from "svelte"
import { currentPathname } from "../../client/location.svelte.js"
import { currentSnapshot } from "../../client/snapshot.svelte.js"
import type { Snapshot } from "../../lib/contract"
import PageFrame from "./PageFrame.svelte"

interface Props {
	/** The page's heading, such as "Net worth". */
	title: string
	/** One sentence under the heading, on what the page shows. */
	intro?: string | undefined
	/** Renders the page from the ready Snapshot. */
	children: Snippet<[Snapshot]>
}

let { title, intro, children }: Props = $props()
</script>

<PageFrame {title} {intro} state={currentSnapshot()} pathname={currentPathname()} {children} />
