import { useHideAmounts, useTheme } from "../../client/preferences-store"
import { cx } from "../ui/cx"

const TOGGLE = cx(
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground",
	"hover:text-foreground aria-pressed:bg-secondary aria-pressed:text-foreground",
	"outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
)

/** The hide-amounts switch and the dark-theme switch. Each is a button that says whether it is on. */
export function PreferenceControls() {
	const [hidden, setHidden] = useHideAmounts()
	const [theme, setTheme] = useTheme()
	return (
		<div className="flex shrink-0 items-center gap-2">
			<button
				type="button"
				aria-pressed={hidden}
				onClick={() => setHidden(!hidden)}
				className={TOGGLE}
			>
				Hide amounts
			</button>
			<button
				type="button"
				aria-pressed={theme === "dark"}
				onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
				className={TOGGLE}
			>
				Dark theme
			</button>
		</div>
	)
}
