import { DISPLAY_LABEL_RULE } from "@trajectonomics/core/sim"
import { criterionShape } from "./criterion-shape"
import { MILESTONE_COMBINES } from "./terms"

/** One Milestone: a named point in the plan that Flows may gate on, fired by its criteria. */
export const milestoneShape: Record<string, unknown> = {
	type: "object",
	description:
		"One named point in the plan that a Flow may gate on. It fires on the first date its criteria hold, judged on the Scenario's own figures; a Flow's `startAt` and `endAt` name it.",
	properties: {
		id: {
			type: "string",
			description:
				"The name a Flow's `startAt` or `endAt`, or a milestone criterion's `milestone`, uses. Unique within the Scenario.",
		},
		displayLabel: {
			type: "string",
			minLength: 1,
			maxLength: 80,
			description: `What a person reads in place of the id, written as ${DISPLAY_LABEL_RULE}. It is no key: a Flow's gate still names the id, and the label may repeat or change. It changes no figure (sim ADR 0032).`,
		},
		combine: {
			enum: [...MILESTONE_COMBINES],
			description: "`all` fires once every criterion holds; `any` fires once one of them holds.",
		},
		criteria: {
			type: "array",
			items: criterionShape,
			description:
				"The criteria the Milestone is judged by. A non-empty list whose ids are unique within the Milestone.",
		},
	},
	required: ["id", "combine", "criteria"],
	additionalProperties: false,
}
