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