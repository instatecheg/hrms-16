<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<div class="w-full sm:w-96">
				<div
					class="flex flex-row bg-[var(--color-surface)] shadow-sm py-4 px-3 items-center border-b"
				>
					<Button variant="ghost" class="!px-1 mr-1 hover:bg-white" @click="router.back()">
						<FeatherIcon name="chevron-left" class="h-5 w-5" />
					</Button>
					<h2 class="text-xl font-semibold text-[var(--color-primary)]">
						{{ __("New Maintenance Log") }}
					</h2>
				</div>
			</div>
		</ion-header>

		<ion-content>
			<div class="flex flex-col p-4 gap-4 w-full sm:w-96">
				<div class="flex flex-col gap-1">
					<label class="text-sm text-gray-600">{{ __("Vehicle") }}</label>
					<div
						class="w-full rounded border border-[var(--color-card-border)] text-sm p-2.5 bg-[var(--color-card-bg)] text-gray-700"
					>
						{{ vehicle || __("No vehicle assigned to you") }}
					</div>
				</div>

				<div class="flex flex-col gap-1">
					<label class="text-sm text-gray-600">{{ __("Maintenance Date") }} *</label>
					<input
						v-model="form.maintenance_date"
						type="date"
						class="w-full rounded border border-[var(--color-card-border)] text-sm p-2.5 text-gray-700"
					/>
				</div>

				<div class="flex flex-col gap-1">
					<label class="text-sm text-gray-600">{{ __("Odometer (km)") }} *</label>
					<input
						v-model="form.odometer_km"
						type="number"
						class="w-full rounded border border-[var(--color-card-border)] text-sm p-2.5 text-gray-700"
						:placeholder="__('Current odometer reading')"
					/>
				</div>

				<div class="flex flex-col gap-1">
					<label class="text-sm text-gray-600">{{ __("Maintenance Type") }} *</label>
					<select
						v-model="form.maintenance_type"
						class="w-full rounded border border-[var(--color-card-border)] text-sm p-2.5 text-gray-700"
					>
						<option value="" disabled>{{ __("Select type") }}</option>
						<option value="Corrective">{{ __("Corrective") }}</option>
						<option value="Preventive">{{ __("Preventive") }}</option>
					</select>
				</div>

				<div class="flex flex-col gap-1">
					<label class="text-sm text-gray-600">{{ __("Service Provider") }} *</label>
					<select
						v-model="form.service_provider_type"
						class="w-full rounded border border-[var(--color-card-border)] text-sm p-2.5 text-gray-700"
					>
						<option value="" disabled>{{ __("Select provider") }}</option>
						<option value="Internal Workshop">{{ __("Internal Workshop") }}</option>
						<option value="External Workshop">{{ __("External Workshop") }}</option>
					</select>
				</div>

				<div v-if="form.service_provider_type === 'External Workshop'" class="flex flex-col gap-1">
					<label class="text-sm text-gray-600">{{ __("Supplier") }}</label>
					<input
						v-model="form.supplier"
						type="text"
						class="w-full rounded border border-[var(--color-card-border)] text-sm p-2.5 text-gray-700"
						:placeholder="__('Workshop / supplier name')"
					/>
				</div>

				<div class="flex flex-col gap-1">
					<label class="text-sm text-gray-600">{{ __("Notes") }}</label>
					<textarea
						v-model="form.notes"
						rows="3"
						class="w-full rounded border border-[var(--color-card-border)] text-sm p-2.5 text-gray-700"
						:placeholder="__('Anything else about this service...')"
					/>
				</div>

				<Button
					variant="solid"
					class="w-full py-5 mt-2 !bg-[var(--color-primary)] hover:!bg-[var(--color-primary-hover)] !text-white"
					:loading="submitting"
					:disabled="!isValid"
					@click="handleSubmit"
				>
					{{ __("Save") }}
				</Button>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup>
import { ref, computed, inject, onMounted } from "vue"
import { useRouter } from "vue-router"
import { IonPage, IonHeader, IonContent } from "@ionic/vue"
import { FeatherIcon, toast } from "frappe-ui"

import { getDriverVehicles, createMaintenanceLog } from "@/data/maintenanceLogs"

const __ = inject("$translate")
const router = useRouter()

const vehicle = ref("")
const submitting = ref(false)

const form = ref({
	maintenance_date: new Date().toISOString().slice(0, 10),
	odometer_km: "",
	maintenance_type: "",
	service_provider_type: "",
	supplier: "",
	notes: "",
})

const isValid = computed(() => {
	return (
		vehicle.value &&
		form.value.maintenance_date &&
		form.value.odometer_km &&
		form.value.maintenance_type &&
		form.value.service_provider_type
	)
})

onMounted(async () => {
	const vehicles = await getDriverVehicles()
	vehicle.value = vehicles[0] || ""
})

async function handleSubmit() {
	submitting.value = true
	try {
		const doc = await createMaintenanceLog({
			vehicle: vehicle.value,
			maintenance_date: form.value.maintenance_date,
			odometer_km: form.value.odometer_km,
			maintenance_type: form.value.maintenance_type,
			service_provider_type: form.value.service_provider_type,
			supplier: form.value.supplier,
			notes: form.value.notes,
		})

		toast({
			title: __("Success"),
			text: __("Maintenance log created."),
			icon: "check-circle",
			position: "bottom-center",
			iconClasses: "text-green-500",
		})

		router.replace({ name: "MaintenanceDetailPage", params: { id: doc.name } })
	} catch (err) {
		toast({
			title: __("Error"),
			text: err?.messages?.[0] || __("Could not create maintenance log."),
			icon: "alert-circle",
			position: "bottom-center",
		})
	} finally {
		submitting.value = false
	}
}
</script>