<template>
	<Teleport to="body">
		<div
			v-if="modelValue"
			class="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40"
			@click.self="$emit('close')"
		>
			<div
				class="w-full sm:w-96 rounded-t-2xl overflow-hidden max-h-[90vh] bg-[var(--color-surface)] flex flex-col"
			>
				<!-- Header -->
				<div class="flex flex-row items-center justify-between p-4 border-b shrink-0">
					<span class="text-[var(--color-primary)] font-bold text-lg">
						{{ isNew ? __("New Maintenance Log") : log.name }}
					</span>
					<div class="flex flex-row items-center gap-2">
						<span
							v-if="!isNew"
							class="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-card-selected-bg)] text-[var(--color-primary)]"
						>
							{{ log.status }}
						</span>
						<Button
							v-if="isEditable && !isNew"
							variant="ghost"
							class="!px-1.5 !text-red-600 hover:!bg-red-50"
							:loading="deleting"
							@click="handleDelete"
						>
							<FeatherIcon name="trash-2" class="w-4 h-4" />
						</Button>
					</div>
				</div>

				<!-- Fields -->
				<div class="flex flex-col gap-4 p-4 overflow-y-auto">
					<div v-if="loadingDoc" class="flex items-center justify-center py-6">
						<LoadingIndicator class="w-6 h-6 text-[var(--color-primary)]" />
					</div>

					<template v-else>
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
								:disabled="!isEditable"
								class="w-full rounded border border-[var(--color-card-border)] text-sm p-2.5 text-gray-700 disabled:bg-[var(--color-card-bg)] disabled:text-gray-500"
							/>
						</div>

						<div class="flex flex-col gap-1">
							<label class="text-sm text-gray-600">{{ __("Odometer (km)") }} *</label>
							<input
								v-model="form.odometer_km"
								type="number"
								:disabled="!isEditable"
								class="w-full rounded border border-[var(--color-card-border)] text-sm p-2.5 text-gray-700 disabled:bg-[var(--color-card-bg)] disabled:text-gray-500"
							/>
						</div>

						<div class="flex flex-col gap-1">
							<label class="text-sm text-gray-600">{{ __("Maintenance Type") }} *</label>
							<select
								v-model="form.maintenance_type"
								:disabled="!isEditable"
								class="w-full rounded border border-[var(--color-card-border)] text-sm p-2.5 text-gray-700 disabled:bg-[var(--color-card-bg)] disabled:text-gray-500"
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
								:disabled="!isEditable"
								class="w-full rounded border border-[var(--color-card-border)] text-sm p-2.5 text-gray-700 disabled:bg-[var(--color-card-bg)] disabled:text-gray-500"
							>
								<option value="" disabled>{{ __("Select provider") }}</option>
								<option value="Internal Workshop">{{ __("Internal Workshop") }}</option>
								<option value="External Workshop">{{ __("External Workshop") }}</option>
							</select>
						</div>

						<div
							v-if="form.service_provider_type === 'External Workshop'"
							class="flex flex-col gap-1"
						>
							<label class="text-sm text-gray-600">{{ __("Supplier") }}</label>
							<input
								v-model="form.supplier"
								type="text"
								:disabled="!isEditable"
								class="w-full rounded border border-[var(--color-card-border)] text-sm p-2.5 text-gray-700 disabled:bg-[var(--color-card-bg)] disabled:text-gray-500"
							/>
						</div>

						<div class="flex flex-col gap-1">
							<label class="text-sm text-gray-600">{{ __("Notes") }}</label>
							<textarea
								v-model="form.notes"
								rows="3"
								:disabled="!isEditable"
								class="w-full rounded border border-[var(--color-card-border)] text-sm p-2.5 text-gray-700 disabled:bg-[var(--color-card-bg)] disabled:text-gray-500"
							/>
						</div>

						<!-- Parts used -->
						<div class="flex flex-col gap-2">
							<div class="flex flex-row items-center justify-between">
								<label class="text-sm text-gray-600">{{ __("Parts Used") }}</label>
								<Button
									v-if="isEditable"
									variant="ghost"
									class="!text-[var(--color-primary)] !px-1.5"
									@click="addPart"
								>
									<template #prefix>
										<FeatherIcon name="plus" class="w-3.5 h-3.5" />
									</template>
									{{ __("Add Part") }}
								</Button>
							</div>

							<div
								v-for="(part, idx) in form.parts"
								:key="idx"
								class="flex flex-col gap-2 p-3 rounded border border-[var(--color-card-border)] bg-[var(--color-card-bg)]"
							>
								<div class="flex flex-row items-center justify-between">
									<span class="text-xs font-medium text-gray-500">{{ __("Part") }} {{ idx + 1 }}</span>
									<Button
										v-if="isEditable"
										variant="ghost"
										class="!px-1 !text-red-600 hover:!bg-red-50"
										@click="removePart(idx)"
									>
										<FeatherIcon name="trash-2" class="w-3.5 h-3.5" />
									</Button>
								</div>

								<LinkField
									v-model="part.item_code"
									doctype="Item"
									:disabled="!isEditable"
									:placeholder="__('Search item...')"
								/>
								<div class="flex flex-row gap-2">
									<input
										v-model="part.qty"
										type="number"
										:disabled="!isEditable"
										:placeholder="__('Qty')"
										class="w-1/2 rounded border border-[var(--color-card-border)] text-sm p-2 bg-white text-gray-700 disabled:bg-[var(--color-card-bg)] disabled:text-gray-500"
									/>
									<input
										v-model="part.uom"
										type="text"
										:disabled="!isEditable"
										:placeholder="__('Unit (e.g. Nos)')"
										class="w-1/2 rounded border border-[var(--color-card-border)] text-sm p-2 bg-white text-gray-700 disabled:bg-[var(--color-card-bg)] disabled:text-gray-500"
									/>
								</div>
								<LinkField
									v-model="part.warehouse"
									doctype="Warehouse"
									:disabled="!isEditable"
									:placeholder="__('Search warehouse...')"
								/>
								<input
									v-model="part.notes"
									type="text"
									:disabled="!isEditable"
									:placeholder="__('Note (optional)')"
									class="w-full rounded border border-[var(--color-card-border)] text-sm p-2 bg-white text-gray-700 disabled:bg-[var(--color-card-bg)] disabled:text-gray-500"
								/>
							</div>

							<div v-if="!form.parts.length" class="text-xs text-gray-400">
								{{ __("No parts added") }}
							</div>
						</div>

						<div v-if="!isEditable" class="text-xs text-[var(--color-blue-muted)]">
							{{ __("This log is no longer a draft and can't be edited here.") }}
						</div>
					</template>
				</div>

				<!-- Actions -->
				<div class="flex flex-row gap-3 p-4 border-t shrink-0">
					<Button variant="outline" class="w-full py-5" @click="$emit('close')">
						{{ isEditable ? __("Cancel") : __("Close") }}
					</Button>
					<Button
						v-if="isEditable"
						variant="solid"
						class="w-full py-5 !bg-[var(--color-primary)] hover:!bg-[var(--color-primary-hover)] !text-white"
						:loading="saving"
						:disabled="!isValid || loadingDoc"
						@click="handleSave"
					>
						{{ __("Save") }}
					</Button>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup>
import { ref, computed, watch, inject } from "vue"
import { FeatherIcon, LoadingIndicator, toast } from "frappe-ui"

import LinkField from "@/components/LinkField.vue"
import {
	getDriverVehicles,
	getMaintenanceLog,
	createMaintenanceLog,
	updateMaintenanceLog,
	deleteMaintenanceLog,
} from "@/data/maintenanceLogs"

const __ = inject("$translate")

const props = defineProps({
	modelValue: {
		// null = closed; {} (empty-ish) = create mode; a real log = edit mode
		type: Object,
		default: null,
	},
})

const emit = defineEmits(["close", "saved"])

const log = computed(() => props.modelValue)
const isNew = computed(() => !log.value?.name)
const isEditable = computed(() => isNew.value || log.value?.status === "Draft")
const vehicle = ref("")
const saving = ref(false)
const deleting = ref(false)
const loadingDoc = ref(false)

const form = ref(blankForm())

function blankForm() {
	return {
		maintenance_date: new Date().toISOString().slice(0, 10),
		odometer_km: "",
		maintenance_type: "",
		service_provider_type: "",
		supplier: "",
		notes: "",
		parts: [],
	}
}

function blankPart() {
	return { item_code: "", qty: 1, uom: "Nos", warehouse: "", notes: "" }
}

function addPart() {
	form.value.parts.push(blankPart())
}

function removePart(idx) {
	form.value.parts.splice(idx, 1)
}

// (re)populate the form whenever a different log is opened, or reset for "new".
// The list row only carries flat fields, so editing an existing log fetches
// the full document (to get its parts) before showing the form.
watch(
	() => props.modelValue,
	async (val) => {
		if (!val) return

		if (val.name) {
			loadingDoc.value = true
			try {
				const doc = await getMaintenanceLog(val.name)
				form.value = {
					maintenance_date: doc.maintenance_date,
					odometer_km: doc.odometer_km,
					maintenance_type: doc.maintenance_type,
					service_provider_type: doc.service_provider_type,
					supplier: doc.supplier || "",
					notes: doc.notes || "",
					parts: (doc.parts || []).map((p) => ({
						item_code: p.item_code,
						qty: p.qty,
						uom: p.uom,
						warehouse: p.s_warehouse || "",
						notes: p.notes || "",
					})),
				}
				vehicle.value = doc.vehicle
			} finally {
				loadingDoc.value = false
			}
		} else {
			form.value = blankForm()
			const vehicles = await getDriverVehicles()
			vehicle.value = vehicles[0] || ""
		}
	},
	{ immediate: true }
)

const isValid = computed(() => {
	return (
		vehicle.value &&
		form.value.maintenance_date &&
		form.value.odometer_km &&
		form.value.maintenance_type &&
		form.value.service_provider_type
	)
})

function buildPayload() {
	const { parts, ...rest } = form.value
	return {
		...rest,
		parts: parts
			.filter((p) => p.item_code)
			.map((p) => ({
				doctype: "Truck Maintenance Log Part",
				item_code: p.item_code,
				item_name: p.item_code,
				qty: p.qty,
				uom: p.uom,
				s_warehouse: p.warehouse,
				notes: p.notes,
				cost_type: "Spare Parts",
			})),
	}
}

async function handleSave() {
	saving.value = true
	try {
		if (isNew.value) {
			await createMaintenanceLog({ vehicle: vehicle.value, ...buildPayload() })
			toast({
				title: __("Success"),
				text: __("Maintenance log created."),
				icon: "check-circle",
				position: "bottom-center",
				iconClasses: "text-green-500",
			})
		} else {
			await updateMaintenanceLog(log.value.name, buildPayload())
			toast({
				title: __("Success"),
				text: __("Maintenance log updated."),
				icon: "check-circle",
				position: "bottom-center",
				iconClasses: "text-green-500",
			})
		}
		emit("saved")
	} catch (err) {
		toast({
			title: __("Error"),
			text: err?.messages?.[0] || __("Could not save maintenance log."),
			icon: "alert-circle",
			position: "bottom-center",
		})
	} finally {
		saving.value = false
	}
}

async function handleDelete() {
	deleting.value = true
	try {
		await deleteMaintenanceLog(log.value.name)
		toast({
			title: __("Deleted"),
			text: __("Maintenance log deleted."),
			icon: "trash-2",
			position: "bottom-center",
		})
		emit("saved")
	} catch (err) {
		toast({
			title: __("Error"),
			text: err?.messages?.[0] || __("Could not delete maintenance log."),
			icon: "alert-circle",
			position: "bottom-center",
		})
	} finally {
		deleting.value = false
	}
}
</script>