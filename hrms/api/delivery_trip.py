import re

import frappe
import requests
import json



@frappe.whitelist()
def mark_all_delivery_stops_visited(trip_name):
	"""
	Marks every Delivery Stop row under this Delivery Trip as visited=1,
	writing directly via frappe.db.set_value (same bypass-the-controller-hooks
	approach as force_update_delivery_trip) so it isn't affected by whatever
	status-recalculation logic runs on a normal doc.save().
	"""
	if not frappe.has_permission("Delivery Trip", "write", doc=trip_name):
		frappe.throw(frappe._("Not permitted to update this Delivery Trip"))

	stop_names = frappe.db.get_all(
		"Delivery Stop",
		filters={"parent": trip_name, "parenttype": "Delivery Trip"},
		pluck="name",
	)

	for stop_name in stop_names:
		frappe.db.set_value("Delivery Stop", stop_name, "visited", 1, update_modified=True)

	frappe.db.commit()

	return len(stop_names)

@frappe.whitelist()
def force_update_delivery_trip(name, fields):
	"""
	Directly write the given fields on a Delivery Trip via frappe.db.set_value,
	bypassing doc.save()/validate() — so any controller logic that recalculates
	`status` (e.g. based on delivery_stops progress) doesn't silently override
	the value we're explicitly setting here (start/delivered/stop/end actions).

	`fields` is a dict of {fieldname: value}, e.g.
		{"status": "In Transit", "departure_location_latitude": 29.97, ...}
	"""
	if isinstance(fields, str):
		fields = json.loads(fields)

	if not frappe.has_permission("Delivery Trip", "write", doc=name):
		frappe.throw(frappe._("Not permitted to update this Delivery Trip"))

	frappe.db.set_value("Delivery Trip", name, fields, update_modified=True)
	frappe.db.commit()

	return frappe.db.get_value("Delivery Trip", name, list(fields.keys()), as_dict=True)

@frappe.whitelist()
def resolve_map_coordinates(url):
	headers = {
		"User-Agent": (
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
			"AppleWebKit/537.36 (KHTML, like Gecko) "
			"Chrome/120.0.0.0 Safari/537.36"
		)
	}

	try:
		resp = requests.get(url, headers=headers, allow_redirects=True, timeout=10)
	except requests.RequestException:
		frappe.log_error(
			title="resolve_map_coordinates: request failed",
			message=frappe.get_traceback(),
		)
		return None

	final_url = resp.url

	# 1. coordinates embedded directly in the final redirected URL, e.g. .../@24.63,46.71,15z
	match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", final_url)

	# 1b. some short links redirect to a /maps/search/<lat>,+<lng> path instead
	#     (the space between lat and lng is URL-encoded as "+")
	if not match:
		match = re.search(r"/search/(-?\d+\.\d+),\+?\s*(-?\d+\.\d+)", final_url)

	# 2. Google often embeds them in the page body as !3d<lat>!4d<lng> even when
	#    the URL itself doesn't carry them (share links commonly do this)
	if not match:
		match = re.search(r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)", resp.text)

	# 3. fallback: any @lat,lng pattern anywhere in the page body
	if not match:
		match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", resp.text)

	if not match:
		frappe.log_error(
			title="resolve_map_coordinates: no match",
			message=f"Original URL: {url}\nFinal URL: {final_url}\n\nBody (first 2000 chars):\n{resp.text[:2000]}",
		)
		return None

	return {"latitude": float(match.group(1)), "longitude": float(match.group(2))}

# ---------------------------------------------------------------------------
# Driver app: trip details and the driver's steps
#   Draft -> Start -> In Transit -> (Stop -> Stopped -> Resume ->) In Transit -> Delivered -> End -> Ended
# The trip stays a draft: the supervisor reviews it (Reviewed) and the accounts manager completes it.
# ---------------------------------------------------------------------------
TRIP = "Delivery Trip"
TRIP_GPS_FIELDS = {
	# action: (map link field, latitude field, longitude field)
	"start": ("lh_departure_location", "departure_location_latitude", "departure_location_longitude"),
	"stop": ("lh_stop_location", "stop_location_latitude", "stop_location_longitude"),
	"resume": ("lh_resume_location", None, None),
	"delivered": ("lh_arrival_location", "arrival_location_latitude", "arrival_location_longitude"),
}
TRIP_NEXT_STATUS = {"start": "In Transit", "stop": "Stopped", "resume": "In Transit", "delivered": "Delivered", "end": "Ended"}
# The Customer Location is not required to Start: while it is empty the driver can also ask the
# supervisor for it ("request_customer_location").
TRIP_ACTIONS_BY_STATUS = {
	"Draft": ["start", "request_customer_location"],
	"Scheduled": ["start", "request_customer_location"],
	"In Transit": ["delivered", "stop"],
	"Stopped": ["resume"],
	"Delivered": ["end"],
}


def _trip_actions(doc):
	if doc.docstatus != 0:
		return []
	actions = TRIP_ACTIONS_BY_STATUS.get(doc.get("status") or "Draft", [])
	if str(doc.get("lh_customer_location") or "").strip():
		actions = [a for a in actions if a != "request_customer_location"]
	return actions


def _trip_for_driver(name):
	"""The trip, only for its own driver (or a supervisor / admin)."""
	from hrms.api.transportation_request import _driver_user

	if not name or not frappe.db.exists(TRIP, name):
		frappe.throw(frappe._("Delivery Trip not found"))
	doc = frappe.get_doc(TRIP, name)
	is_manager = {"Supervisor", "System Manager"} & set(frappe.get_roles())
	if not is_manager and _driver_user(doc.get("driver")) != frappe.session.user:
		frappe.throw(frappe._("This trip is not assigned to you."), frappe.PermissionError)
	return doc


def _trip_attachments(name):
	user = frappe.session.user
	files = frappe.get_all(
		"File",
		filters={"attached_to_doctype": TRIP, "attached_to_name": name},
		fields=["name", "file_name", "file_url", "owner", "creation"],
		order_by="creation desc",
		limit_page_length=0,
	)
	for row in files:
		row["can_delete"] = user == "Administrator" or row.get("owner") == user
	return files


def _trip_detail(doc):
	"""Shown in the same order as the request sheet; the location is the trip's Customer Location."""
	request = doc.get("lh_transportation_request") if doc.meta.has_field("lh_transportation_request") else None
	req = (
		frappe.db.get_value("Transportation Request", request, ["customer_info", "from", "to"], as_dict=True)
		if request
		else None
	) or {}
	customer = doc.get("lh_customer")
	return {
		"name": doc.name,
		"status": doc.get("status") or "Draft",
		"docstatus": doc.docstatus,
		"transportation_request": request,
		"customer": customer,
		"customer_name": (frappe.db.get_value("Customer", customer, "customer_name") if customer else None) or customer,
		"customer_info": req.get("customer_info"),
		"departure_time": doc.get("departure_time"),
		"from": req.get("from") or doc.get("lh_source_city"),
		"to": req.get("to") or doc.get("lh_destination_city"),
		"vehicle": doc.get("vehicle"),
		"driver": doc.get("driver"),
		"driver_name": doc.get("driver_name"),
		"location": doc.get("lh_customer_location"),
		"stop_reason": doc.get("stop_reason"),
		"customer_scale": doc.get("lh_customer_first_weight"),
		"actions": _trip_actions(doc),
		# The driver can still start; this only shows the "location missing" hint.
		"needs_customer_location": doc.docstatus == 0
		and (doc.get("status") or "Draft") in ("Draft", "Scheduled")
		and not str(doc.get("lh_customer_location") or "").strip(),
		"attachments": _trip_attachments(doc.name),
	}


@frappe.whitelist()
def get_driver_trip(name=None):
	return _trip_detail(_trip_for_driver(name))


@frappe.whitelist(methods=["POST"])
def driver_trip_action(name=None, action=None, latitude=None, longitude=None, reason=None, customer_scale=None):
	"""Start / Stop / Resume / Delivered (with the phone's GPS), End (customer scale + attachment),
	or ask the supervisor for the customer location."""
	_ = frappe._
	doc = _trip_for_driver(name)
	allowed = _trip_actions(doc)
	if action not in allowed:
		frappe.throw(_("This step is not available for a trip that is {0}.").format(_(doc.get("status") or "Draft")))

	if action == "request_customer_location":
		if "telegram_connector" in frappe.get_installed_apps():
			from telegram_connector.delivery_trip import request_customer_location

			request_customer_location(doc.name)
		doc.add_comment("Info", _("The driver asked for the customer location."))
		frappe.db.commit()
		return _trip_detail(doc)

	values = {"status": TRIP_NEXT_STATUS[action]}
	gps = TRIP_GPS_FIELDS.get(action)
	if gps:
		try:
			lat, lng = float(latitude), float(longitude)
		except (TypeError, ValueError):
			frappe.throw(_("Your location is required. Please allow location access and try again."))
		link_field, lat_field, lng_field = gps
		values[link_field] = f"https://maps.google.com/?q={lat},{lng}"
		if lat_field:
			values[lat_field], values[lng_field] = lat, lng
	if action == "stop":
		reason = str(reason or "").strip()
		if not reason:
			frappe.throw(_("Please enter the reason for stopping the trip."))
		values["stop_reason"] = reason
	if action == "end":
		# The proof must be a file attached with the customer scale (after Delivered), not one copied
		# from the request or added at Start.
		proof_filters = {"attached_to_doctype": TRIP, "attached_to_name": doc.name}
		if doc.get("lh_delivered_on"):
			proof_filters["creation"] = [">=", doc.get("lh_delivered_on")]
		if not frappe.db.count("File", proof_filters):
			frappe.throw(_("Attach the customer scale / delivery proof before ending the trip."))
		# The customer scale is optional; when given, the dashboards take it as one reading
		# (End Customer Scale = customer net).
		if frappe.utils.flt(customer_scale) > 0:
			values["lh_customer_first_weight"] = frappe.utils.flt(customer_scale)
			values["lh_customer_net_weight"] = frappe.utils.flt(customer_scale)

	for fieldname, value in values.items():
		if doc.meta.has_field(fieldname):
			doc.set(fieldname, value)
	if action == "delivered":
		if doc.meta.has_field("lh_delivered_on"):
			doc.lh_delivered_on = frappe.utils.now_datetime()
		for stop in doc.get("delivery_stops") or []:
			stop.visited = 1
	# A normal save, so the trip's hooks run (e.g. the supervisor's Telegram message on End).
	doc.flags.ignore_mandatory = True
	doc.save(ignore_permissions=True)
	frappe.db.commit()
	return _trip_detail(doc)
