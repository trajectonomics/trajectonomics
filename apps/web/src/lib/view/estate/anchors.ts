import type { HouseholdDocument, ScenarioDocument } from "../../contract"
import { formatDate } from "../../format"
import { anchorWords, itemNames, itemText } from "../item-names"
import type { DateChoice } from "./dates"

/** The household anchors that pin a Flow's start or end, with the date the document holds for it. */
export function anchorChoices(
	doc: ScenarioDocument,
	household: HouseholdDocument | null,
	lastDate: string,
): DateChoice[] {
	const names = itemNames(new Map(), household, doc)
	return (household?.anchors ?? []).flatMap((anchor) => {
		const [list, id, edge] = anchor.path.split(".")
		if (list !== "flows" || id === undefined || (edge !== "start" && edge !== "end")) return []
		const flow = doc.flows.find((one) => one.id === id)
		const date = flow?.[edge]
		if (date === undefined || date > lastDate) return []
		const verb = edge === "start" ? "starts" : "ends"
		return [
			{
				value: `anchor:${anchor.path}`,
				label: `When ${itemText(names, "flow", id)} ${verb}, ${anchorWords(anchor, names.people)} (${formatDate(date)})`,
				date,
			},
		]
	})
}
