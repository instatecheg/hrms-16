import { reactive } from "vue"
import { call } from "frappe-ui"

const STATUS_GROUPS = {
	active: ["Draft","Scheduled", "In Transit", "Delivered", "Stopped"],
	history: ["Completed", "Cancelled"],
}

const ALL_STATUSES = [
	"Draft",
	"Scheduled",
	"In Transit",
	"Delivered",
	"Stopped",
	"Completed",
	"Cancelled",
]

// cache the resolved Driver record for the logged-in user for this session
let driverPromise = null

async function getSessionDriver() {
	if (driverPromise) return driverPromise

	driverPromise = (async () => {
		const user = await call("frappe.auth.get_logged_user")

		const drivers = await call("frappe.client.get_list", {
			doctype: "Driver",
			fields: ["name"],
			filters: { user },
			limit_page_length: 1,
		})

		return drivers.length ? drivers[0].name : null
	})()

	return driverPromise
}

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
	"docstatus",
	"stop_reason",
	"departure_location_latitude",
	"departure_location_longitude",
	"arrival_location_latitude",
	"arrival_location_longitude",
]

function transformTripData(data) {
	return data.map((trip) => {
		trip.doctype = "Delivery Trip"
		return trip
	})
}

async function fetchTripsForDriver(extraFilters = {}) {
	const driver = await getSessionDriver()
	if (!driver) return []

	const data = await call("frappe.client.get_list", {
		doctype: "Delivery Trip",
		fields: TRIP_LIST_FIELDS,
		filters: { driver, ...extraFilters },
		order_by: "departure_time asc",
	})

	return transformTripData(data)
}

// company-wide trips, not scoped to the logged-in driver — used for the
// "Team Requests" view. Adjust the filters here if "team" should instead
// mean e.g. drivers reporting to this employee.
async function fetchAllTrips(extraFilters = {}) {
	const data = await call("frappe.client.get_list", {
		doctype: "Delivery Trip",
		fields: TRIP_LIST_FIELDS,
		filters: {...extraFilters },
		order_by: "departure_time asc",
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
	fetchTripsForDriver({ status: ["in", ALL_STATUSES] })
)

export const teamDeliveryTrips = createTripResource(() =>
	fetchAllTrips({ status: ["in", ALL_STATUSES] })
)

export async function fetchTripsSummary() {
	const trips = await fetchTripsForDriver()

	const summary = { Scheduled: 0, "In Transit": 0, Completed: 0, Cancelled: 0 }
	trips.forEach((trip) => {
		if (summary[trip.status] !== undefined) summary[trip.status] += 1
	})

	return summary
}

export async function fetchTodayTrips() {
	const today = new Date()
	const start = new Date(today.setHours(0, 0, 0, 0)).toISOString().slice(0, 19)
	const end = new Date(today.setHours(23, 59, 59, 999)).toISOString().slice(0, 19)

	return fetchTripsForDriver({
		departure_time: ["between", [start, end]],
	})
}

export async function fetchTripsByStatusGroup(group) {
	return fetchTripsForDriver({
		status: ["in", STATUS_GROUPS[group] || ALL_STATUSES],
	})
}


async function forceUpdateTrip(tripName, fields) {
	const saved = await call("hrms.api.delivery_trip.force_update_delivery_trip", {
		name: tripName,
		fields,
	})

	// the server returns what is actually stored; if status/docstatus differ from what
	// we asked for, fail loudly instead of pretending the step succeeded
	for (const key of ["status", "docstatus"]) {
		if (key in fields && saved && String(saved[key]) !== String(fields[key])) {
			throw new Error(`${key} was not saved: expected "${fields[key]}", server has "${saved[key]}"`)
		}
	}

	return saved
}

export async function updateTripStatus(tripName, status) {
	return forceUpdateTrip(tripName, { status })
}

// The document is NEVER submitted: every step writes docstatus = 0 together with the new
// status, so the status moves (In Transit / Stopped / Completed) while it stays a draft.
// Only the fields listed in each call are written; nothing else is cleared or changed.
const NOT_SUBMITTED = { docstatus: 0 }

// Start: status -> In Transit, driver's current position is recorded as the departure location
export async function startTrip(tripName, { latitude, longitude }) {
	return forceUpdateTrip(tripName, {
		status: "In Transit",
		...NOT_SUBMITTED,
		departure_location_latitude: latitude,
		departure_location_longitude: longitude,
	})
}

// (legacy, no longer used by DeliveryTripActionSheet.vue — the Delivered step was removed)
export async function markDelivered(tripName, { latitude, longitude }) {
	return forceUpdateTrip(tripName, {
		status: "Delivered",
		arrival_location_latitude: latitude,
		arrival_location_longitude: longitude,
	})
}

// Stop: status -> Stopped (docstatus stays 0). Driver's current position is recorded
// in the stop location fields together with the reason.
export async function stopTrip(tripName, reason, { latitude, longitude }) {
	return forceUpdateTrip(tripName, {
		status: "Stopped",
		...NOT_SUBMITTED,
		stop_reason: reason,
		stop_location_latitude: latitude,
		stop_location_longitude: longitude,
	})
}

// Resume: status -> In Transit again (docstatus stays 0; stop_reason and locations are kept)
export async function resumeTrip(tripName) {
	return forceUpdateTrip(tripName, { status: "In Transit", ...NOT_SUBMITTED })
}

// End: status -> Delivered (docstatus stays 0). Driver's current position is recorded as the
// arrival location together with the customer scale reading. The delivery proof file is
// attached separately (see DeliveryTripActionSheet.vue's FileUploader).
// It also ticks "visited" on every Delivery Stop row of the trip.
export async function completeTrip(tripName, customerFirstWeight, { latitude, longitude }) {
	const saved = await forceUpdateTrip(tripName, {
		status: "Delivered",
		...NOT_SUBMITTED,
		arrival_location_latitude: latitude,
		arrival_location_longitude: longitude,
		lh_customer_first_weight: customerFirstWeight,
	})

	// server side: sets visited = 1 on all stops via frappe.db.set_value (no status recalculation)
	await call("hrms.api.delivery_trip.mark_all_delivery_stops_visited", {
		trip_name: tripName,
	})

	return saved
}

export { STATUS_GROUPS, ALL_STATUSES }