/** The share image's width in pixels: what Slack, X, LinkedIn and iMessage read a large card as. */
export const SHARE_IMAGE_WIDTH = 1200

/** The share image's height in pixels: the other half of the 1.91:1 card every share sheet crops to. */
export const SHARE_IMAGE_HEIGHT = 630

/** The margin the image's content keeps from its edges, in pixels. */
export const MARGIN = 72

/** The height the brand lockup is drawn at, in pixels. */
export const LOCKUP_HEIGHT = 64

/** The type size of the mono meta line level with the lockup's bottom, in pixels. */
export const META_SIZE = 18

/** The baseline of that meta line, level with the lockup's bottom edge. */
export const META_BASELINE = MARGIN + LOCKUP_HEIGHT

/** The type size of the statement: the page's own one line, at the largest size three lines allow. */
export const STATEMENT_SIZE = 44

/** The distance between two of the statement's baselines, in pixels. */
export const STATEMENT_LINE_HEIGHT = 58

/** The baseline the statement's last line sits on, so a longer statement grows upwards. */
export const STATEMENT_LAST_BASELINE = 452

/** The width of the accent rule above the statement, in pixels. */
export const RULE_WIDTH = 56

/** The height of that rule, in pixels. */
export const RULE_HEIGHT = 6

/** The distance from that rule down to the statement's first baseline, in pixels. */
export const RULE_GAP = 26

/** The baseline of the origin line under the statement, in pixels. */
export const ORIGIN_BASELINE = 556

/** The baselines a statement of `count` lines sits on, in reading order, the last one lowest. */
export function statementBaselines(count: number): readonly number[] {
	return Object.freeze(
		Array.from(
			{ length: count },
			(_, index) => STATEMENT_LAST_BASELINE - STATEMENT_LINE_HEIGHT * (count - 1 - index),
		),
	)
}

/** The top of the accent rule above a statement of `count` lines, in pixels. */
export function ruleTop(count: number): number {
	const first = statementBaselines(count)[0] ?? STATEMENT_LAST_BASELINE
	return first - STATEMENT_SIZE - RULE_GAP
}
