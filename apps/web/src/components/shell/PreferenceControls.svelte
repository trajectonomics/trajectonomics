<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import { HIDE_AMOUNTS_ENABLED } from "../../lib/view/preferences"
import { cx } from "../ui/cx"

const TOGGLE = cx(
	"rounded-md border border-border bg-card px-3 py-2 text-left text-sm text-muted-foreground",
	"hover:text-foreground aria-pressed:bg-secondary aria-pressed:text-foreground",
	"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
)
</script>

<!-- The display switches: the dark Theme and the traj commands, and Hide amounts while that feature is on (#927 keeps it off until #926). Each is a button that says whether it is on. -->
<div class="flex flex-col gap-2">
	{#if HIDE_AMOUNTS_ENABLED}
		<button
			type="button"
			aria-pressed={preferences.hidden}
			onclick={() => preferences.setHidden(!preferences.hidden)}
			class={TOGGLE}
		>
			Hide amounts
		</button>
	{/if}
	<button
		type="button"
		aria-pressed={preferences.theme === "dark"}
		onclick={() => preferences.setTheme(preferences.theme === "dark" ? "light" : "dark")}
		class={TOGGLE}
	>
		Dark theme
	</button>
	<button
		type="button"
		aria-pressed={preferences.showCommands}
		onclick={() => preferences.setShowCommands(!preferences.showCommands)}
		class={TOGGLE}
	>
		Show traj commands
	</button>
</div>
