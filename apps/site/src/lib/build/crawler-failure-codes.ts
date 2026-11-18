/** Stable codes for every way a Crawler file or an Answer engine file can fail verification. One code per rule. */
export type CrawlerFailureCode =
	| "ROBOTS_NAMED_AGENT_MISSING"
	| "ROBOTS_NAMED_ALLOW_MISSING"
	| "JSON_LD_CLAIM_PRESENT"
	| "LLMS_FILE_MISSING"
	| "LLMS_PLACEHOLDER_PRESENT"
	| "LLMS_HOME_MISSING"
	| "INDEXNOW_KEY_FILE_MISSING"
	| "INDEXNOW_KEY_FILE_WRONG"
