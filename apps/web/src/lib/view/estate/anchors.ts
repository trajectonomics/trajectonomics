import type { HouseholdDocument, ScenarioDocument } from "../../contract"
import { formatDate } from "../../format"
import { anchorWords, personNames } from "../item-names"
import type { DateChoice } from "./dates"

/** The household anchors that pin a Flow's start or end, with the date the document holds for it. */
export function anchorChoices(
	doc: ScenarioDocument,
	household: HouseholdDocument | null,
	lastDate: string,
): DateChoice[] {
	const people = personNames(household)
	return (household?.anchors ?? []).flatMap((anchor) => {
		const [list, id, edge] = anchor.path.split(".")
		if (list !== "flows" || (edge !== "start" && edge !== "end")) return []
		const flow = doc.flows.find((one) => one.id === id)
		const date = flow?.[edge]
		if (date === undefined || date > lastDate) return []
		const verb = edge === "start" ? "starts" : "ends"
		return [
			{
				value: `anchor:${anchor.path}`,
				label: `When ${id} ${verb}, ${anchorWords(anchor, people)} (${formatDate(date)})`,
				date,
			},
		]
	})
}
