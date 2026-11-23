<script lang="ts" generics="T extends string">
import { cx } from "./cx"
import { radiosOf, restoreRadios } from "./restore"
import type { SegmentedOption } from "./segmented-option"

interface Props {
	/** The radio group's name. Unique on the page. */
	name: string
	/** The group's accessible name, such as "Scenario". */
	label: string
	options: readonly SegmentedOption<T>[]
	value: T
	/** Returns false when the page refused the choice: the group then shows the value the page holds. */
	onChange: (value: T) => unknown
}

let { name, label, options, value, onChange }: Props = $props()

/** Passes the choice on; a refused one puts the group back on the value the page still holds. */
function choose(option: T, group: HTMLFieldSetElement | null): void {
	if (onChange(option) === false && group !== null) restoreRadios(radiosOf(group), value)
}
</script>

<!-- A choice among a few options, as a row of native radio buttons. The arrow keys move the choice. -->
<fieldset class="inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-border p-1">
	<legend class="sr-only">{label}</legend>
	{#each options as option (option.value)}
		<label class="cursor-pointer">
			<input
				type="radio"
				{name}
				value={option.value}
				checked={option.value === value}
				onchange={(event) => choose(option.value, event.currentTarget.closest("fieldset"))}
				class="peer sr-only"
			/>
			<span
				class={cx(
					"block rounded-md px-3 py-1.5 text-sm",
					"peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
					option.value === value
						? "bg-primary text-primary-foreground"
						: "text-muted-foreground hover:text-foreground",
				)}>{option.label}</span
			>
		</label>
	{/each}
</fieldset>
