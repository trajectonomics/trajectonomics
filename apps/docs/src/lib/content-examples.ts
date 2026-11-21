import type { ContentFile } from "./content-pages"
import {
	accountReferences,
	declaredAccounts,
	SCENARIO_DOCUMENT_KEYS,
	scenarioDocument,
} from "./scenario-document"

/** One rule of the example check; one value per way a published example can be incomplete. */
export type ContentExamplesRule = "scenario-document-missing" | "scenario-document-dangling-account"

/** One page that publishes an incomplete Scenario document. */
export interface ContentExamplesProblem {
	readonly rule: ContentExamplesRule
	readonly file: string
	readonly detail: string
}

/** The Operator page that documents `traj scenario apply`, its document and its flags. */
const SCENARIO_PAGE = "cli/commands/scenario.mdx"

function scenarioProblems(file: ContentFile): readonly ContentExamplesProblem[] {
	const lookup = scenarioDocument(file.content)
	if (lookup.kind !== "document") {
		const detail =
			lookup.kind === "absent"
				? `no json fence qualifies as a Scenario document; it needs ${SCENARIO_DOCUMENT_KEYS.join(", ")}`
				: `the Scenario document omits ${lookup.missing.join(", ")}`
		return [{ rule: "scenario-document-missing", file: file.path, detail }]
	}
	const declared = declaredAccounts(lookup.document)
	return accountReferences(lookup.document).flatMap(({ path, account }) =>
		declared.has(account)
			? []
			: [
					{
						rule: "scenario-document-dangling-account",
						file: file.path,
						detail: `${path} names "${account}", which accounts does not declare`,
					},
				],
	)
}

/** Every way the authored pages publish an incomplete Scenario document. */
export function checkContentExamples(
	files: readonly ContentFile[],
): readonly ContentExamplesProblem[] {
	return files.flatMap((file) => {
		return file.path === SCENARIO_PAGE ? scenarioProblems(file) : []
	})
}
