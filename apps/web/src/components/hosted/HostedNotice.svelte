<script lang="ts">
import { currentPathname } from "../../client/location.svelte.js"
import { shellPanels } from "../../client/shell.svelte.js"
import FeedbackFaces from "./FeedbackFaces.svelte"
import { INSTALL_URL } from "./message"
</script>

<!-- One line above the top bar on every hosted page: the figures are made up and the Edit controls are off. -->
<div
	role="note"
	aria-label="About this demo"
	inert={shellPanels.menu}
	class="border-b border-border bg-muted text-xs text-muted-foreground print:hidden lg:pl-60"
>
	<div
		class="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 sm:px-6"
	>
		<p>
			Demo with made-up numbers. Changes are switched off.
			<a
				href={INSTALL_URL}
				class="font-medium text-foreground underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
				>Get traj</a
			>
		</p>
		<FeedbackFaces pathname={currentPathname()} />
	</div>
</div>
