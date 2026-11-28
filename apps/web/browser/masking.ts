import { test } from "@playwright/test"
import { HIDE_AMOUNTS_ENABLED } from "../src/lib/view/preferences"

/**
 * Skips a check of the masking while Hide amounts is off (#927). The masking code stays for the share feature
 * (#926); with its switch on, these checks run again.
 */
export function skipMaskingCheck(): void {
	test.skip(
		!HIDE_AMOUNTS_ENABLED,
		"Hide amounts is off (#927); masking returns with the share feature (#926).",
	)
}
