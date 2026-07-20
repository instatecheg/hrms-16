import { reactive } from "vue"
import { call } from "frappe-ui"

const STATUS_GROUPS = {
	active: ["Scheduled", "In Transit", "Delivered", "Stopped"],
	history: ["Completed", "Cancelled"],
}

const ALL_STATUSES = [
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
		filters: { driver, docstatus: ["!=", 0], ...extraFilters },
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
		filters: { docstatus: ["!=", 0], ...extraFilters },
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
	return call("hrms.api.delivery_trip.force_update_delivery_trip", {
		name: tripName,
		fields,
	})
}

export async function updateTripStatus(tripName, status) {
	return forceUpdateTrip(tripName, { status })
}

// Start: driver's current position is recorded as the departure location
export async function startTrip(tripName, { latitude, longitude }) {
	return forceUpdateTrip(tripName, {
		status: "In Transit",
		departure_location_latitude: latitude,
		departure_location_longitude: longitude,
	})
}

// Delivered: driver's current position is recorded as the arrival location
export async function markDelivered(tripName, { latitude, longitude }) {
	return forceUpdateTrip(tripName, {
		status: "Delivered",
		arrival_location_latitude: latitude,
		arrival_location_longitude: longitude,
	})
}

// Stop (renamed from Emergency Stop)
export async function stopTrip(tripName, reason) {
	return forceUpdateTrip(tripName, {
		status: "Stopped",
		stop_reason: reason,
	})
}

// End: customer scale reading closes the trip out. The delivery proof file
// is attached separately (see DeliveryTripActionSheet.vue's FileUploader),
// this just records the weight and flips status to Completed.
export async function completeTrip(tripName, customerFirstWeight) {
	return forceUpdateTrip(tripName, {
		status: "Completed",
		lh_customer_first_weight: customerFirstWeight,
	})
}

export { STATUS_GROUPS, ALL_STATUSES }