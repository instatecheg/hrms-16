// Badge colours (frappe-ui Badge "theme") for trip statuses and transportation request states,
// shared by the lists and the sheets so a status always has the same colour.

const TRIP_STATUS_THEME = {
	Draft: "gray",
	Scheduled: "gray",
	"In Transit": "blue",
	Stopped: "red",
	Delivered: "orange",
	Ended: "orange",
	Reviewed: "blue",
	Completed: "green",
	Cancelled: "red",
}

const REQUEST_STATE_THEME = {
	Draft: "gray",
	"Sent to driver": "blue",
	"Driver heading to loading": "blue",
	"Driver at loading location": "orange",
	"Confirmed by driver": "green",
	"Documents requested": "orange",
	"Trip created": "green",
	"Cancelled by driver": "red",
	Cancelled: "red",
}

export const tripStatusTheme = (status) => TRIP_STATUS_THEME[status] || "gray"
export const requestStateTheme = (state) => REQUEST_STATE_THEME[state] || "gray"
