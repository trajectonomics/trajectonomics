/** One choice of a SegmentedControl: the value it sets, and the words on its button. */
export interface SegmentedOption<Value extends string> {
	readonly value: Value
	readonly label: string
}
