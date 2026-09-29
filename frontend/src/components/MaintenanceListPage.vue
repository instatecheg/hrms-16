<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<div class="w-full sm:w-96">
				<div
					class="flex flex-row bg-[var(--color-surface)] shadow-sm py-4 px-3 items-center justify-between border-b"
				>
					<div class="flex flex-row items-center">
						<Button variant="ghost" class="!px-1 mr-1 hover:bg-white" @click="router.back()">
							<FeatherIcon name="chevron-left" class="h-5 w-5" />
						</Button>
						<h2 class="text-xl font-semibold text-[var(--color-primary)]">
							{{ __("Maintenance") }}
						</h2>
					</div>

					<Button
						variant="solid"
						class="!bg-[var(--color-primary)] hover:!bg-[var(--color-primary-hover)] !text-white"
						@click="openCreate"
					>
						<template #prefix>
							<FeatherIcon name="plus" class="w-4" />
						</template>
						{{ __("New") }}
					</Button>
				</div>
			</div>
		</ion-header>

		<ion-content>
			<div class="flex flex-col items-center mb-7 p-4 h-full w-full sm:w-96 overflow-y-auto">
				<div class="w-full">
					<div
						class="flex flex-col bg-[var(--color-surface)] rounded"
						v-if="!loading && logs.length"
					>
						<div
							class="flex flex-row p-3.5 items-center justify-between border-b cursor-pointer"
							v-for="log in logs"
							:key="log.name"
							@click="openEdit(log)"
						>
							<MaintenanceItem :doc="log" />
						</div>
					</div>
					<EmptyState :message="__('No maintenance logs found')" v-else-if="!loading" />

					<div v-if="loading" class="flex mt-2 items-center justify-center">
						<LoadingIndicator class="w-8 h-8 text-[var(--color-primary)]" />
					</div>
				</div>
			</div>
		</ion-content>

		<MaintenanceEditSheet v-model="selectedLog" @close="closeSheet" @saved="onSaved" />
	</ion-page>
</template>

<script setup>
import { ref, inject, onMounted } from "vue"
import { useRouter } from "vue-router"
import { IonPage, IonHeader, IonContent } from "@ionic/vue"
import { FeatherIcon, LoadingIndicator } from "frappe-ui"

import MaintenanceItem from "@/components/MaintenanceItem.vue"
import MaintenanceEditSheet from "@/components/MaintenanceEditSheet.vue"
import EmptyState from "@/components/EmptyState.vue"

import { fetchAllDriverLogs } from "@/data/maintenanceLogs"

const __ = inject("$translate")
const router = useRouter()

const logs = ref([])
const loading = ref(true)
const selectedLog = ref(null)

function openEdit(log) {
	selectedLog.value = log
}

function openCreate() {
	selectedLog.value = {}
}

function closeSheet() {
	selectedLog.value = null
}

function onSaved() {
	closeSheet()
	loadLogs()
}

async function loadLogs() {
	loading.value = true
	try {
		logs.value = await fetchAllDriverLogs()
	} finally {
		loading.value = false
	}
}

onMounted(loadLogs)
</script>