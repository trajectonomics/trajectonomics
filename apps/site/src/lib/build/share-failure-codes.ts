/** Stable codes for every way a Language home's share image can fail verification. One code per rule. */
export type ShareFailureCode =
	| "SHARE_IMAGE_MISSING"
	| "SHARE_IMAGE_NOT_PNG"
	| "SHARE_IMAGE_SIZE_WRONG"
	| "SHARE_IMAGE_TOO_HEAVY"
