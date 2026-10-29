<template>
	<BaseLayout>
		<template #body>
			<div class="flex flex-col items-center p-4 pb-8 gap-6">
				<!-- Greeting -->
				<div
					class="relative w-full overflow-hidden rounded-[var(--radius-card)] p-5 text-white bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] shadow-[0_14px_28px_-14px_rgba(10,159,132,0.9)]"
				>
					<div class="absolute -end-8 -top-10 h-36 w-36 rounded-full bg-white/10"></div>
					<div class="absolute end-10 -bottom-12 h-28 w-28 rounded-full bg-white/10"></div>
					<div class="relative flex flex-col gap-1">
						<span class="text-sm text-white/85">{{ today }}</span>
						<span class="text-xl font-bold">
							{{ __("Hello, {0}", [user.data.first_name || user.data.full_name || ""]) }}
						</span>
						<span class="text-sm text-white/90">{{ __("Here is your day at a glance.") }}</span>
					</div>
				</div>

				<!-- Quick actions -->
				<div class="w-full grid grid-cols-4 gap-2">
					<router-link
						v-for="link in quickLinks"
						:key="link.route"
						:to="{ name: link.route }"
						class="flex flex-col items-center gap-2 active:scale-95 transition"
					>
						<div class="app-card flex items-center justify-center w-14 h-14 text-[var(--color-primary)]">
							<component :is="link.icon" v-if="link.icon" class="w-6 h-6" />
							<FeatherIcon v-else :name="link.feather" class="w-6 h-6" />
						</div>
						<span class="text-[11px] font-medium text-gray-700 text-center leading-tight">
							{{ link.title }}
						</span>
					</router-link>
				</div>

				<DeliveryTripSummary ref="summary" :showTitle="false" />

				<TodayTrips @updated="summary?.reload()" />

				<TodayRequests />
			</div>
		</template>
	</BaseLayout>
</template>

<script setup>
import { computed, inject, markRaw, ref } from "vue"
import { FeatherIcon } from "frappe-ui"

import BaseLayout from "@/components/BaseLayout.vue"
import DeliveryTripSummary from "@/components/DeliveryTripSummary.vue"
import TodayRequests from "@/components/TodayRequests.vue"
import TodayTrips from "@/components/TodayTrips.vue"
import ExpenseIcon from "@/components/icons/ExpenseIcon.vue"
import DeliveryTripIcon from "@/components/icons/DeliveryTripIcon.vue"
import MaintenanceIcon from "@/components/icons/MaintenanceIcon.vue"
import { usePageRefresh } from "@/composables/pageRefresh"

const __ = inject("$translate")
const user = inject("$user")
const dayjs = inject("$dayjs")

// reloads the summary, today's trips and the requests (see composables/pageRefresh.js)
usePageRefresh()

const summary = ref(null)
const today = computed(() => dayjs().format("dddd, D MMMM"))

const quickLinks = [
	{
		icon: markRaw(DeliveryTripIcon),
		title: __("Trips"),
		route: "DeliveryTripListPage",
	},
	{
		feather: "clipboard",
		title: __("Requests"),
		route: "TransportationRequestListPage",
	},
	{
		icon: markRaw(ExpenseIcon),
		title: __("Claim an Expense"),
		route: "ExpenseClaimFormView",
	},
	{
		icon: markRaw(MaintenanceIcon),
		title: __("Maintenance"),
		route: "MaintenanceListPage",
	},
]
</script>
