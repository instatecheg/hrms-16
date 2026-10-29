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
						{{ request.name }}
					</span>
					<Badge
						v-if="request.workflow_state"
						variant="subtle"
						:theme="requestStateTheme(request.workflow_state)"
						:label="__(request.workflow_state, null, 'Transportation Request')"
						size="md"
					/>
				</div>

				<!-- Details -->
				<div class="flex flex-col gap-4 p-4 overflow-y-auto">
					<div
						v-if="loadingDetail"
						class="flex flex-row gap-2 items-center justify-center p-5"
					>
						<LoadingIndicator class="w-3 h-3 text-gray-800" />
						<span class="text-gray-900 text-sm">{{ __("Loading...") }}</span>
					</div>

					<div
						v-for="row in detailRows"
						:key="row.label"
						class="flex flex-row items-center justify-between w-full gap-3"
					>
						<div class="text-gray-600 text-base shrink-0">{{ __(row.label) }}</div>
						<a
							v-if="row.link"
							:href="row.link"
							target="_blank"
							rel="noopener"
							class="flex flex-row items-center gap-1 text-base font-medium text-[var(--color-primary)] underline"
						>
							<FeatherIcon name="map-pin" class="h-4 w-4" />
							{{ __("Open in Maps") }}
						</a>
						<div v-else class="text-gray-800 text-base font-medium text-right whitespace-pre-line">{{ row.value }}</div>
					</div>

					<!-- Cancelled by the driver: show why, until the supervisor confirms the cancellation -->
					<div
						v-if="request.rejection_reason"
						class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
					>
						<div class="font-semibold">{{ __("Cancellation Reason") }}</div>
						<div>{{ request.rejection_reason }}</div>
					</div>

					<!-- Confirmed: attachments, then "Request Documents" -->
					<template v-if="showAttachments">
						<!-- Files from earlier steps: listed, but they do not count for "Request Documents" -->
						<div v-if="previousAttachments.length" class="flex flex-col gap-2">
							<label class="text-sm text-gray-600">{{ __("Previous Attachments") }}</label>
							<a
								v-for="file in previousAttachments"
								:key="file.name"
								:href="file.file_url"
								target="_blank"
								rel="noopener"
								class="flex flex-row items-center gap-2 rounded bg-gray-100 p-2 text-sm text-gray-700"
							>
								<FeatherIcon name="paperclip" class="h-4 w-4 shrink-0 text-gray-500" />
								<span class="grow break-all">{{ file.file_name || file.name }}</span>
							</a>
						</div>

						<div class="flex flex-col gap-2">
							<label class="text-sm text-gray-600">{{ __("Required Attachments") }} *</label>

							<div
								class="flex flex-row gap-2 items-center justify-center p-5"
								v-if="uploadingSection === 'required'"
							>
								<LoadingIndicator class="w-3 h-3 text-gray-800" />
								<span class="text-gray-900 text-sm">{{ __("Uploading...") }}</span>
							</div>

							<FileUploaderView
								v-else
								v-model="requiredAttachments"
								:canDelete="ownFile"
								@handleFileSelect="(e) => handleFileSelect(e, 'required')"
								@handleFileDelete="(file) => handleFileDelete(file, 'required')"
							/>

							<span v-if="!totalAttachments" class="text-xs text-red-600">
								{{ __("At least one attachment is required.") }}
							</span>
						</div>

						<div class="flex flex-col gap-2">
							<label class="text-sm text-gray-600">{{ __("Additional Attachments") }}</label>

							<div
								class="flex flex-row gap-2 items-center justify-center p-5"
								v-if="uploadingSection === 'other'"
							>
								<LoadingIndicator class="w-3 h-3 text-gray-800" />
								<span class="text-gray-900 text-sm">{{ __("Uploading...") }}</span>
							</div>

							<FileUploaderView
								v-else
								v-model="otherAttachments"
								:canDelete="ownFile"
								@handleFileSelect="(e) => handleFileSelect(e, 'other')"
								@handleFileDelete="(file) => handleFileDelete(file, 'other')"
							/>
						</div>
					</template>

					<!-- Any other state: every file attached to the request (read only) -->
					<div
						v-if="!showAttachments && confirming !== 'cancel' && requiredAttachments.length"
						class="flex flex-col gap-2"
					>
						<label class="text-sm text-gray-600">{{ __("Attachments") }}</label>
						<a
							v-for="file in requiredAttachments"
							:key="file.name"
							:href="file.file_url"
							target="_blank"
							rel="noopener"
							class="flex flex-row items-center gap-2 rounded bg-gray-100 p-2 text-sm text-gray-700"
						>
							<FeatherIcon name="paperclip" class="h-4 w-4 shrink-0 text-gray-500" />
							<span class="grow break-all">{{ file.file_name || file.name }}</span>
						</a>
					</div>

					<!-- Cancel (on the way or at the loading location): reason required, attachments optional -->
					<div v-if="confirming === 'cancel'" class="flex flex-col gap-2">
						<div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
							{{ __("Cancel this request? The supervisor will be asked to confirm the cancellation.") }}
						</div>
						<label class="text-sm text-gray-600">{{ __("Cancellation Reason") }} *</label>
						<textarea
							v-model="cancelReason"
							rows="3"
							class="w-full rounded border border-gray-300 p-2 text-base"
							:placeholder="__('Why are you cancelling this request?')"
						/>

						<label class="text-sm text-gray-600">{{ __("Attachments") }}</label>
						<div
							class="flex flex-row gap-2 items-center justify-center p-5"
							v-if="uploadingSection === 'cancel'"
						>
							<LoadingIndicator class="w-3 h-3 text-gray-800" />
							<span class="text-gray-900 text-sm">{{ __("Uploading...") }}</span>
						</div>
						<FileUploaderView
							v-else
							v-model="cancelAttachments"
							:canDelete="ownFile"
							@handleFileSelect="(e) => handleFileSelect(e, 'cancel')"
							@handleFileDelete="(file) => handleFileDelete(file, 'cancel')"
						/>
					</div>

					<!-- Nothing for the driver to do: say who the request is waiting for -->
					<div
						v-if="waitingMessage"
						class="rounded-lg bg-[var(--color-card-selected-bg)] p-3 text-sm text-gray-700"
					>
						{{ waitingMessage }}
					</div>
				</div>

				<!-- Actions -->
				<div class="flex flex-col gap-3 p-4 border-t shrink-0">
					<template v-if="!confirming">
						<Button
							v-if="can('Head to loading location')"
							variant="solid"
							:class="primaryButton"
							:loading="busy"
							@click="runAction('Head to loading location', { withLocation: true })"
						>
							{{ __("Go to Location") }}
						</Button>

						<!-- On the way: arrive, or cancel -->
						<div v-if="can('Confirm arrival at loading')" class="flex flex-row gap-3">
							<Button
								variant="solid"
								:class="primaryButton"
								:loading="busy"
								@click="runAction('Confirm arrival at loading', { withLocation: true })"
							>
								{{ __("Arrived at Loading Location") }}
							</Button>
							<Button
								v-if="can(DRIVER_CANCEL)"
								variant="outline"
								class="py-5 !border-red-600 !text-red-600"
								:disabled="busy"
								@click="confirming = 'cancel'"
							>
								{{ __("Cancel") }}
							</Button>
						</div>

						<!-- At the loading location: the driver's confirmation -->
						<div v-if="can('Confirm')" class="flex flex-row gap-3">
							<Button
								variant="solid"
								class="w-full py-5 !bg-green-600 hover:!bg-green-700 !text-white"
								:loading="busy"
								@click="runAction('Confirm')"
							>
								{{ __("Confirm") }}
							</Button>
							<Button
								variant="solid"
								class="w-full py-5 !bg-red-600 hover:!bg-red-700 !text-white"
								:disabled="busy"
								@click="confirming = 'cancel'"
							>
								{{ __("Cancel") }}
							</Button>
						</div>

						<Button
							v-if="can('Request documents')"
							variant="solid"
							:class="primaryButton"
							:loading="busy"
							:disabled="!totalAttachments || !!uploadingSection"
							@click="runAction('Request documents')"
						>
							{{ __("Request Documents") }}
						</Button>

						<Button variant="outline" class="w-full py-5" @click="$emit('close')">
							{{ __("Close") }}
						</Button>
					</template>

					<div v-else class="flex flex-row gap-3">
						<Button variant="outline" class="w-full py-5" :disabled="busy" @click="confirming = null">
							{{ __("Back") }}
						</Button>
						<Button
							variant="solid"
							class="w-full py-5 !bg-red-600 hover:!bg-red-700 !text-white"
							:loading="busy"
							:disabled="!cancelReason.trim() || !!uploadingSection"
							@click="runAction(DRIVER_CANCEL, { reason: cancelReason.trim() })"
						>
							{{ __("Confirm Cancellation") }}
						</Button>
					</div>
				</div>
			</div>
		</div>
	</Teleport>
</template>

<script setup>
import { ref, computed, watch, inject, onUnmounted } from "vue"
import { Badge, FeatherIcon, LoadingIndicator, call, toast } from "frappe-ui"

import FileUploaderView from "@/components/FileUploaderView.vue"
import { FileAttachment } from "@/composables"
import { useTripLocation } from "@/composables/useTripLocation"
import { requestStateTheme } from "@/utils/statusColors"
import { changeMatches, onDataChange } from "@/data/sync"

const __ = inject("$translate")
const dayjs = inject("$dayjs")

const props = defineProps({
	modelValue: {
		type: Object,
		default: null,
	},
})

const emit = defineEmits(["close", "updated"])

const { latitude, longitude, fetchLocation } = useTripLocation()

const primaryButton =
	"w-full py-5 !bg-[var(--color-primary)] hover:!bg-[var(--color-primary-hover)] !text-white"

// Full request from the server: the fields shown below, the driver's allowed
// actions for the current workflow state, and the files already attached.
const detail = ref(null)
const loadingDetail = ref(false)
const busy = ref(false)
// null or "cancel": the driver is filling in the cancellation (reason + optional attachments)
const confirming = ref(null)
const cancelReason = ref("")
// Workflow action behind both "Cancel" buttons (on the way and at the loading location)
const DRIVER_CANCEL = "Driver cancel"

const request = computed(() => detail.value || props.modelValue || {})

// Two sections in the UI, but all files are attached to the request itself
// and aren't tagged per section on the server — so after reopening, every
// file added in this step is listed under "Required Attachments", and a
// file in either section satisfies the requirement.
const requiredAttachments = ref([])
const otherAttachments = ref([])
const cancelAttachments = ref([])
// "Confirmed by driver": files attached before the driver confirmed (read only, not counted)
const previousAttachments = ref([])
const lists = { required: requiredAttachments, other: otherAttachments, cancel: cancelAttachments }

const uploadingSection = ref(null)

const totalAttachments = computed(
	() => requiredAttachments.value.length + otherAttachments.value.length
)

const can = (action) => (detail.value?.actions || []).includes(action)

// Only the person who attached a file can remove it (the server decides: can_delete).
// A file just uploaded in this session is the driver's own.
const ownFile = (file) => file.can_delete !== false

// Attachments are added once the driver confirmed, and stay editable until the trip is created.
const showAttachments = computed(() =>
	["Confirmed by driver", "Documents requested"].includes(request.value.workflow_state)
)

const WAITING_MESSAGES = {
	"Documents requested": "Documents requested. Waiting for the documents and diesel to be prepared and the trip to start.",
	"Cancelled by driver": "You cancelled this request. Waiting for the supervisor to confirm the cancellation.",
	"Trip created": "The trip has been created for this request.",
	Cancelled: "This request was cancelled.",
}
const waitingMessage = computed(() => {
	if (loadingDetail.value || !detail.value || detail.value.actions?.length) return ""
	const message = WAITING_MESSAGES[request.value.workflow_state]
	return message ? __(message) : ""
})

// Shown in this order: customer name, customer info (only when filled), departure date,
// departure time, from, to, vehicle, driver, location.
const detailRows = computed(() => {
	if (!props.modelValue) return []
	const r = request.value
	const departure = r.departure_time ? dayjs(r.departure_time) : null
	return [
		{ label: "Customer Name", value: r.customer_name || r.customer },
		{ label: "Customer Info", value: r.customer_info },
		{ label: "Departure Date", value: departure ? departure.format("D MMM YYYY") : "" },
		{ label: "Departure Time", value: departure ? departure.format("hh:mm a") : "" },
		{ label: "From", value: r.from },
		{ label: "To", value: r.to },
		{ label: "Vehicle", value: r.vehicle },
		{ label: "Driver", value: r.driver_name || r.driver },
		{ label: "Location", value: r.location, link: r.location },
	].filter((row) => row.value)
})

function setDetail(data) {
	detail.value = data
	const files = (data?.attachments || []).map((f) => ({ ...f, uploaded: true }))
	// Request Documents needs a file added in this step: older files are only listed.
	const splitOld = data?.workflow_state === "Confirmed by driver"
	requiredAttachments.value = splitOld ? files.filter((f) => f.current_step) : files
	previousAttachments.value = splitOld ? files.filter((f) => !f.current_step) : []
	otherAttachments.value = []
}

// load the request (with its allowed actions and files) whenever one is opened
watch(
	() => props.modelValue?.name,
	async (name) => {
		detail.value = null
		confirming.value = null
		cancelReason.value = ""
		requiredAttachments.value = []
		previousAttachments.value = []
		otherAttachments.value = []
		cancelAttachments.value = []
		if (!name) return

		loadingDetail.value = true
		try {
			setDetail(
				await call("hrms.api.transportation_request.get_driver_transportation_request", { name })
			)
		} catch (err) {
			showError(err)
		} finally {
			loadingDetail.value = false
		}
	},
	{ immediate: true }
)

// Show the request's new step when someone else moves it (e.g. the Trip Documents team),
// unless the driver is in the middle of a step.
const stopSync = onDataChange(async (changes) => {
	const name = props.modelValue?.name
	if (!name || loadingDetail.value || busy.value || uploadingSection.value || confirming.value) return
	if (!changeMatches(changes, ["Transportation Request"], name)) return
	try {
		const data = await call("hrms.api.transportation_request.get_driver_transportation_request", { name })
		if (props.modelValue?.name !== name || busy.value) return
		if (data.workflow_state !== detail.value?.workflow_state) setDetail(data)
	} catch {
		// a background refresh: keep what is on screen
	}
})
onUnmounted(stopSync)

function showError(err) {
	toast({
		title: __("Error"),
		text: err?.messages?.[0] || err?.message || __("Something went wrong."),
		icon: "alert-circle",
		position: "bottom-center",
	})
}

// "Go to Location" / "Arrived at Loading Location" send where the driver is now;
// the server keeps it as a map link on the request.
async function runAction(action, { withLocation = false, reason = null } = {}) {
	busy.value = true
	try {
		const args = { name: request.value.name, action }
		if (withLocation) {
			try {
				await fetchLocation()
			} catch {
				return // fetchLocation already told the driver what went wrong
			}
			args.latitude = latitude.value
			args.longitude = longitude.value
		}
		if (reason) args.reason = reason

		const updated = await call(
			"hrms.api.transportation_request.apply_driver_transportation_request_action",
			args
		)
		setDetail(updated)
		confirming.value = null
		emit("updated", updated)
		toast({
			title: __("Success"),
			text: __(updated.workflow_state, null, "Transportation Request"),
			icon: "check-circle",
			position: "bottom-center",
			iconClasses: "text-green-500",
		})
	} catch (err) {
		showError(err)
	} finally {
		busy.value = false
	}
}

const handleFileSelect = (e, section) => {
	uploadFiles(request.value.name, [...e.target.files], section)
}

const handleFileDelete = async (fileObj, section) => {
	if (fileObj.uploaded) {
		const fileAttachment = new FileAttachment(fileObj)
		await fileAttachment.delete()
	}
	lists[section].value = lists[section].value.filter((file) => file.name !== fileObj.name)
}

async function uploadFiles(documentName, files, section) {
	uploadingSection.value = section

	const results = await Promise.allSettled(
		files.map((file) =>
			new FileAttachment(file)
				.upload("Transportation Request", documentName, "")
				.then((fileDoc) => {
					fileDoc.uploaded = true
					lists[section].value.push(fileDoc)
				})
		)
	)

	if (results.some((r) => r.status === "rejected")) {
		toast({
			title: __("Error"),
			text: __("Some files could not be uploaded."),
			icon: "alert-circle",
			position: "bottom-center",
		})
	}
	uploadingSection.value = null
}
</script>
