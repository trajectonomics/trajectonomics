<script lang="ts">
import { INSTALL_URL } from "./message"
</script>

<!-- One line above the top bar on every hosted page: the figures are made up and the Edit controls are off. -->
<div
	role="note"
	aria-label="About this demo"
	class="border-b border-border bg-muted text-xs leading-5 text-muted-foreground print:hidden lg:pl-60"
>
	<p class="mx-auto w-full max-w-6xl px-4 py-1.5 sm:px-6">
		Demo with made-up numbers. Changes are switched off.
		<a
			href={INSTALL_URL}
			class="font-medium text-foreground underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
			>Get traj</a
		>
	</p>
</div>
