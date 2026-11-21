import { cx } from "./cx"

export interface SegmentedOption<T extends string> {
	readonly value: T
	readonly label: string
}

export interface SegmentedControlProps<T extends string> {
	/** The radio group's name. Unique on the page. */
	readonly name: string
	/** The group's accessible name, such as "Scenario". */
	readonly label: string
	readonly options: readonly SegmentedOption<T>[]
	readonly value: T
	readonly onChange: (value: T) => void
}

/**
 * A choice among a few options, as a row of native radio buttons. The arrow keys move the choice,
 * as they do for any radio group.
 */
export function SegmentedControl<T extends string>({
	name,
	label,
	options,
	value,
	onChange,
}: SegmentedControlProps<T>) {
	return (
		<fieldset className="inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-border p-1">
			<legend className="sr-only">{label}</legend>
			{options.map((option) => (
				<label key={option.value} className="cursor-pointer">
					<input
						type="radio"
						name={name}
						value={option.value}
						checked={option.value === value}
						onChange={() => onChange(option.value)}
						className="peer sr-only"
					/>
					<span
						className={cx(
							"block rounded-md px-3 py-1.5 text-sm",
							"peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
							option.value === value
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{option.label}
					</span>
				</label>
			))}
		</fieldset>
	)
}
