import dayjs from "dayjs"
import updateLocale from "dayjs/plugin/updateLocale"
import localizedFormat from "dayjs/plugin/localizedFormat"
import relativeTime from "dayjs/plugin/relativeTime"
import isToday from "dayjs/plugin/isToday"
import isYesterday from "dayjs/plugin/isYesterday"
import isBetween from "dayjs/plugin/isBetween"

// Importing a locale file registers it with dayjs; it is only *activated* by setDayjsLocale()
import "dayjs/locale/ar"

dayjs.extend(updateLocale)
dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)
dayjs.extend(isToday)
dayjs.extend(isYesterday)
dayjs.extend(isBetween)

// The stock dayjs "ar" locale prints dates with Eastern Arabic digits (٢٠٢٦/٠٩/١٩),
// while amounts, IDs and the rest of Frappe show Western digits (2026/09/19).
// Keep them consistent: flip this to true if you'd rather have Eastern Arabic digits.
const USE_EASTERN_ARABIC_DIGITS = false

if (!USE_EASTERN_ARABIC_DIGITS) {
	dayjs.updateLocale("ar", {
		preparse: (string) => string,
		postformat: (string) => string,
	})
}

/**
 * Activate the dayjs locale (month/weekday names, "2 hours ago", am/pm...)
 * matching the app language. Unsupported languages fall back to English.
 */
export function setDayjsLocale(lang) {
	const base = String(lang || "en")
		.toLowerCase()
		.split(/[-_]/)[0]

	dayjs.locale(base === "ar" ? "ar" : "en")
}

export default dayjs
