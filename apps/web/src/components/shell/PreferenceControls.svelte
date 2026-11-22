<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import { cx } from "../ui/cx"

const TOGGLE = cx(
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground",
	"hover:text-foreground aria-pressed:bg-secondary aria-pressed:text-foreground",
	"outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
)
</script>

<!-- The hide-amounts switch and the dark-theme switch. Each is a button that says whether it is on. -->
<div class="flex shrink-0 items-center gap-2">
	<button
		type="button"
		aria-pressed={preferences.hidden}
		onclick={() => preferences.setHidden(!preferences.hidden)}
		class={TOGGLE}
	>
		Hide amounts
	</button>
	<button
		type="button"
		aria-pressed={preferences.theme === "dark"}
		onclick={() => preferences.setTheme(preferences.theme === "dark" ? "light" : "dark")}
		class={TOGGLE}
	>
		Dark theme
	</button>
</div>
