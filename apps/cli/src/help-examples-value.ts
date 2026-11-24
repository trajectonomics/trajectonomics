import type { Setup } from "./help-examples-setup"

/** An income account takes the difference, and a document states two more values for the batch form. */
export const VALUE_SETUP: Setup = {
	files: {
		"values.json": JSON.stringify({
			against: "Market gains",
			values: [
				{ account: "Investment", date: "2026-06-30", value: "520000.00" },
				{ account: "Investment", date: "2026-04-30", value: "495000.00" },
			],
		}),
	},
	steps: [["account", "add", "Market gains", "--type", "income", "--currency", "THB"]],
}
