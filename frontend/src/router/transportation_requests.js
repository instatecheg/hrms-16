const routes = [
	{
		name: "TransportationRequestListPage",
		path: "/transportation-requests",
		component: () => import("@/views/transportation_request/List.vue"),
	},
]

export default routes