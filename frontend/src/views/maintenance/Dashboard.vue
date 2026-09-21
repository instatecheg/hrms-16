<template>
	<BaseLayout :pageTitle="__('Maintenance')">
		<template #body>
			<div class="flex flex-col items-center my-7 p-4 gap-7 bg-[var(--color-bg-page)]">
				<MaintenanceSummary />

				<RecentMaintenance @openLog="openLog" />

				<router-link :to="{ name: 'MaintenanceListPage' }" v-slot="{ navigate }" class="w-full">
					<Button
						variant="ghost"
						@click="navigate"
						class="w-full !text-[var(--color-primary)] py-6 text-sm border-none bg-transparent hover:bg-transparent"
					>
						{{ __("View List") }}
					</Button>
				</router-link>
			</div>

			<ion-modal
				ref="modal"
				:is-open="isModalOpen"
				@didDismiss="closeLog"
				:initial-breakpoint="1"
				:breakpoints="[0, 1]"
			>
				<MaintenanceActionSheet v-model="selectedLog" />
			</ion-modal>
		</template>
	</BaseLayout>
</template>

<script setup>
import { ref, inject } from "vue"
import { IonModal } from "@ionic/vue"

import BaseLayout from "@/components/BaseLayout.vue"
import MaintenanceSummary from "@/components/MaintenanceSummary.vue"
import RecentMaintenance from "@/components/RecentMaintenance.vue"
import MaintenanceActionSheet from "@/components/MaintenanceActionSheet.vue"

const __ = inject("$translate")

const isModalOpen = ref(false)
const selectedLog = ref(null)

function openLog(log) {
	selectedLog.value = log
	isModalOpen.value = true
}

function closeLog() {
	isModalOpen.value = false
	selectedLog.value = null
}
</script>