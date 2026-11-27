/** How often a Flow lands, as the words after its amount: "a month", "every two weeks", "a year". */
export function frequencyWords(frequency: string): string {
	switch (frequency) {
		case "once":
			return "once"
		case "daily":
			return "a day"
		case "weekly":
			return "a week"
		case "biweekly":
			return "every two weeks"
		case "monthly":
			return "a month"
		case "quarterly":
			return "a quarter"
		case "annual":
			return "a year"
		default:
			return frequency
	}
}
