<template>
	<BaseLayout :pageTitle="__('Delivery')">
		<template #body>
			<div class="flex flex-col items-center p-4 pb-8 gap-6">
				<DeliveryTripSummary ref="summary" />

				<TodayTrips @updated="summary?.reload()" />

				<router-link :to="{ name: 'DeliveryTripListPage' }" v-slot="{ navigate }" class="w-full">
					<Button class="app-btn-primary w-full py-5" @click="navigate">
						{{ __("View List") }}
					</Button>
				</router-link>
			</div>
		</template>
	</BaseLayout>
</template>

<script setup>
import { ref, inject } from "vue"

import BaseLayout from "@/components/BaseLayout.vue"
import DeliveryTripSummary from "@/components/DeliveryTripSummary.vue"
import TodayTrips from "@/components/TodayTrips.vue"
import { usePageRefresh } from "@/composables/pageRefresh"

const __ = inject("$translate")

usePageRefresh()

const summary = ref(null)
</script>
