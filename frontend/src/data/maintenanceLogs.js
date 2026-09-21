import { call } from "frappe-ui"

const STATUS_GROUPS = {
	active: ["Draft", "Parts Issued"],
	history: ["Completed", "Cancelled"],
}

const ALL_STATUSES = ["Draft", "Parts Issued", "Completed", "Cancelled"]

const LOG_LIST_FIELDS = [
	"name",
	"maintenance_date",
	"vehicle",
	"odometer_km",
	"maintenance_type",
	"service_provider_type",
	"supplier",
	"status",
	"total_parts_qty",
]

function transformLogData(data) {
	return data.map((log) => {
		log.doctype = "Truck Maintenance Log"
		return log
	})
}

// Truck Maintenance Log has no driver/employee link — logs are tracked by
// vehicle, not by who's logged in, so (unlike Delivery Trip) this fetches
// company-wide rather than scoping to the current user.
async function fetchLogs(extraFilters = {}, limit = 0) {
	const data = await call("frappe.client.get_list", {
		doctype: "Truck Maintenance Log",
		fields: LOG_LIST_FIELDS,
		filters: { docstatus: ["!=", 0], ...extraFilters },
		order_by: "maintenance_date desc",
		...(limit ? { limit_page_length: limit } : {}),
	})

	return transformLogData(data)
}

export async function fetchMaintenanceSummary() {
	const logs = await fetchLogs()

	const summary = { Draft: 0, "Parts Issued": 0, Completed: 0, Cancelled: 0 }
	logs.forEach((log) => {
		if (summary[log.status] !== undefined) summary[log.status] += 1
	})

	return summary
}

export async function fetchRecentMaintenance(limit = 5) {
	return fetchLogs({}, limit)
}

export async function fetchMaintenanceByStatusGroup(group) {
	return fetchLogs({
		status: ["in", STATUS_GROUPS[group] || ALL_STATUSES],
	})
}

export { STATUS_GROUPS, ALL_STATUSES }