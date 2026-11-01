import { io } from "socket.io-client"

import { getCachedListResource } from "frappe-ui/src/resources/listResource"
import { getCachedResource } from "frappe-ui/src/resources/resources"

export function initSocket() {
	let siteName = window.site_name
	let socketio_port = window.frappe?.boot?.socketio_port || 9000
	// Deployed: same address as the page, so nginx proxies /socket.io and tells the server which
	// site this is (going straight to the socketio port is refused with "Invalid namespace").
	let origin = import.meta.env.DEV
		? `http://${window.location.hostname}:${socketio_port}`
		: window.location.origin
	let url = `${origin}/${siteName}`
	// keeps retrying: phones lose the connection all the time
	let socket = io(url, {
		withCredentials: true,
	})

	socket.on("hrms:refetch_resource", (data) => {
		if (data.cache_key) {
			let resource =
				getCachedResource(data.cache_key) ||
				getCachedListResource(data.cache_key)

			if (resource) {
				resource.reload()
			}
		}
	})

	return socket
}
