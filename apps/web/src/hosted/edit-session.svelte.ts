import type { editSession as loopbackSession } from "../client/edit.svelte"
import type { AccountValues, ErrorBody } from "../lib/contract"
import type { PreviewAnswer } from "../lib/edit/answer"
import type { EditInput } from "../lib/edit/edit"
import type { AllowancePlan } from "../lib/snapshot/allowance-params"
import type { ChanceInputs } from "../lib/snapshot/chance-params"

/** The loopback session's sentence for a plan that moved on, repeated here so this file imports nothing of it but types. `overrides.test.ts` pins it equal. */
export const STALE_PLAN = "This plan changed since the page read it."

/** The public shape the pages use: what the loopback session has, less its private parts. */
type Session = Pick<typeof loopbackSession, keyof typeof loopbackSession>

/**
 * The hosted build's write path, which does nothing. It holds no token and has no request in it: every Edit is
 * refused where it starts, so the pages that call it find the answer they find when a server is not there.
 */
class HostedEditSession implements Session {
	token = $state<string | null>(null)
	busy = $state(false)
	error = $state<string | null>(null)
	source = $state<string>("form")
	failure = $state<ErrorBody | null>(null)
	stale = $state(false)
	result = $state<AccountValues | null>(null)

	open(): Promise<void> {
		return Promise.resolve()
	}

	clear(): void {
		this.error = null
	}

	run(_edit: EditInput, _source?: string): Promise<boolean> {
		return Promise.resolve(false)
	}

	preview(_edit: EditInput): Promise<PreviewAnswer | null> {
		return Promise.resolve(null)
	}

	reread(_allowances?: AllowancePlan | null): Promise<boolean> {
		return Promise.resolve(false)
	}

	rereadChance(_chance: ChanceInputs): Promise<boolean> {
		return Promise.resolve(false)
	}

	addPlan(_name: string): Promise<boolean> {
		return Promise.resolve(false)
	}
}

/** The one write path of the page, with nothing behind it. */
export const editSession: Session = new HostedEditSession()
