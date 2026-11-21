import type { Fi } from "../../lib/contract"
import { fiModelOf } from "../../lib/view/fi/model"
import { Fact } from "../projection/Fact"
import { ResultStatement } from "../projection/ResultStatement"
import { SiteLink } from "../ui/SiteLink"
import { FiReachable } from "./FiReachable"
import { FiUnreachable } from "./FiUnreachable"

export interface FiResultProps {
	readonly fi: Fi
	/** The argv of the Read the answer came from, for its command. */
	readonly argv: readonly string[]
}

/** One Scenario's FI answer: the date or what binds it, its definition, its statement and its tax pointer. */
export function FiResult({ fi, argv }: FiResultProps) {
	const model = fiModelOf(fi)
	return (
		<div className="space-y-8">
			{model.kind === "reachable" ? (
				<FiReachable model={model} currency={fi.currency} />
			) : (
				<FiUnreachable model={model} currency={fi.currency} />
			)}
			<ResultStatement shape={fi} argv={argv}>
				<Fact label="Method" value={fi.definition.method} />
				<Fact label="Definition version" value={fi.definition.definitionVersion} />
			</ResultStatement>
			{fi.taxYears.length > 0 && (
				<p className="text-sm text-muted-foreground">
					This Scenario has tax years.{" "}
					<SiteLink href="/tax/" className="text-accent underline-offset-4 hover:underline">
						See them on the Tax page
					</SiteLink>
					.
				</p>
			)}
		</div>
	)
}
