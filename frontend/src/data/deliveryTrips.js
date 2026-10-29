import { reactive } from "vue"
import { call } from "frappe-ui"

// Ended / Reviewed / Completed: the driver is done (supervisor review, then accounts).
// "Scheduled" is still fetched (older trips may have it) but is no longer offered as a filter:
// a trip goes Draft -> In Transit -> ... -> Ended.
const STATUS_GROUPS = {
	active: ["Draft", "Scheduled", "In Transit", "Stopped", "Delivered"],
	history: ["Ended", "Reviewed", "Completed", "Cancelled"],
}

const ALL_STATUSES = [
	"Draft",
	"Scheduled",
	"In Transit",
	"Stopped",
	"Delivered",
	"Ended",
	"Reviewed",
	"Completed",
	"Cancelled",
]

const TRIP_LIST_FIELDS = [
	"name",
	"status",
	"vehicle",
	"driver_name",
	"departure_time",
	"lh_customer",
	"lh_source_city",
	"lh_destination_city",
	"lh_quantity",
	"lh_truck_type",
	"lh_source_map_url",
	"lh_destination_map_url",
]

function transformTripData(data) {
	return data.map((trip) => {
		trip.doctype = "Delivery Trip"
		return trip
	})
}

// The driver's own trips, with the customer's name and From / To (resolved on the server).
async function fetchTripsForDriver({ statuses = null, today = false, limit = 0 } = {}) {
	return call("hrms.api.delivery_trip.get_driver_trips", {
		statuses: statuses ? JSON.stringify(statuses) : null,
		today: today ? 1 : 0,
		limit,
	})
}

// Status filter options per tab (no "Scheduled": trips don't use it any more)
export const FILTER_STATUSES = {
	active: STATUS_GROUPS.active.filter((status) => status !== "Scheduled"),
	history: STATUS_GROUPS.history,
}

// company-wide trips, not scoped to the logged-in driver — used for the
// "Team Requests" view. Adjust the filters here if "team" should instead
// mean e.g. drivers reporting to this employee.
async function fetchAllTrips(extraFilters = {}) {
	const data = await call("frappe.client.get_list", {
		doctype: "Delivery Trip",
		fields: TRIP_LIST_FIELDS,
		filters: {...extraFilters },
		order_by: "modified desc",
		limit_page_length: 10,
	})

	return transformTripData(data)
}

// Reactive resource-style wrapper so this behaves like createResource()
// (.data / .reload()) for components that expect that shape, e.g. RequestPanel.vue
function createTripResource(fetcher) {
	const state = reactive({ data: [], loading: false })

	async function reload() {
		state.loading = true
		try {
			state.data = await fetcher()
		} finally {
			state.loading = false
		}
	}

	reload()
	state.reload = reload
	return state
}

export const myDeliveryTrips = createTripResource(() =>
	fetchTripsForDriver({ statuses: ALL_STATUSES })
)

export const teamDeliveryTrips = createTripResource(() =>
	fetchAllTrips({ status: ["in", ALL_STATUSES] })
)

// Counts for the summary tiles
export async function fetchTripsSummary() {
	const trips = await fetchTripsForDriver()

	const summary = { "In Transit": 0, Ended: 0, Completed: 0, Cancelled: 0 }
	trips.forEach((trip) => {
		if (summary[trip.status] !== undefined) summary[trip.status] += 1
	})

	return summary
}

// Trips departing today (the server's date)
export async function fetchTodayTrips() {
	return fetchTripsForDriver({ today: true })
}

export async function fetchTripsByStatusGroup(group) {
	return fetchTripsForDriver({ statuses: STATUS_GROUPS[group] || ALL_STATUSES })
}


// Full trip for the trip sheet: details in the request sheet's order and the driver's next buttons.
export async function getDriverTrip(name) {
	return call("hrms.api.delivery_trip.get_driver_trip", { name })
}

// The driver's steps: start / stop / resume / delivered (with GPS), end (customer scale),
// request_customer_location (Telegram to the supervisor).
export async function driverTripAction(name, action, args = {}) {
	return call("hrms.api.delivery_trip.driver_trip_action", { name, action, ...args })
}

export { STATUS_GROUPS, ALL_STATUSES }