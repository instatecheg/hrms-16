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
					<span
						v-if="request.workflow_state"
						class="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-card-selected-bg)] text-[var(--color-primary)]"
					>
						{{ request.workflow_state }}
					</span>
				</div>

				<!-- Details -->
				<div class="flex flex-col gap-4 p-4 overflow-y-auto">
					<div
						v-for="row in detailRows"
						:key="row.label"
						class="flex flex-row items-center justify-between w-full"
					>
						<div class="text-gray-600 text-base">{{ __(row.label) }}</div>
						<div class="text-gray-800 text-base font-medium text-right">{{ row.value }}</div>
					</div>

					<!-- Required attachments -->
					<div class="flex flex-col gap-2">
						<label class="text-sm text-gray-600">{{ __("Required Attachments") }} *</label>

						<div
							class="flex flex-row gap-2 items-center justify-center p-5"
							v-if="loadingAttachments || uploadingSection === 'required'"
						>
							<LoadingIndicator class="w-3 h-3 text-gray-800" />
							<span class="text-gray-900 text-sm">
								{{ loadingAttachments ? __("Loading attachments...") : __("Uploading...") }}
							</span>
						</div>

						<FileUploaderView
							v-else
							v-model="requiredAttachments"
							@handleFileSelect="(e) => handleFileSelect(e, 'required')"
							@handleFileDelete="(file) => handleFileDelete(file, 'required')"
						/>

						<span v-if="!totalAttachments && !loadingAttachments" class="text-xs text-red-600">
							{{ __("At least one attachment is required.") }}
						</span>
					</div>

					<!-- Additional attachments (optional) -->
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
							@handleFileSelect="(e) => handleFileSelect(e, 'other')"
							@handleFileDelete="(file) => handleFileDelete(file, 'other')"
						/>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex flex-row gap-3 p-4 border-t shrink-0">
					<Button variant="outline" class="w-full py-5" @click="$emit('close')">
						{{ __("Close") }}
					</Button>
					<Button
						variant="solid"
						class="w-full py-5 !bg-[var(--color-primary)] hover:!bg-[var(--color-primary-hover)] !text-white"
						:disabled="!totalAttachments || !!uploadingSection || loadingAttachments"
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
import { LoadingIndicator, call, toast } from "frappe-ui"

import FileUploaderView from "@/components/FileUploaderView.vue"
import { FileAttachment } from "@/composables"

const __ = inject("$translate")

const props = defineProps({
	modelValue: {
		type: Object,
		default: null,
	},
})

const emit = defineEmits(["close"])

const request = computed(() => props.modelValue || {})

// Two sections in the UI, but all files are attached to the request itself
// and aren't tagged per section on the server — so after reopening, every
// file already on the request is listed under "Required Attachments", and a
// file in either section satisfies the requirement.
const requiredAttachments = ref([])
const otherAttachments = ref([])
const lists = { required: requiredAttachments, other: otherAttachments }

const uploadingSection = ref(null)
const loadingAttachments = ref(false)

const totalAttachments = computed(
	() => requiredAttachments.value.length + otherAttachments.value.length
)

const detailRows = computed(() => {
	if (!props.modelValue) return []
	return [
		{ label: "Customer", value: request.value.customer_name || request.value.customer },
		{ label: "Route", value: request.value.route },
		{ label: "Departure Time", value: request.value.departure_time },
		{ label: "Driver", value: request.value.driver_name },
	].filter((row) => row.value)
})

// load whatever's already attached to this request whenever one is opened
watch(
	() => props.modelValue,
	async (val) => {
		requiredAttachments.value = []
		otherAttachments.value = []
		if (!val?.name) return

		loadingAttachments.value = true
		try {
			const files = await call("frappe.client.get_list", {
				doctype: "File",
				filters: {
					attached_to_doctype: "Transportation Request",
					attached_to_name: val.name,
				},
				fields: ["name", "file_name", "file_url"],
			})
			requiredAttachments.value = files.map((f) => ({ ...f, uploaded: true }))
		} finally {
			loadingAttachments.value = false
		}
	},
	{ immediate: true }
)

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

// Files are already saved on the request as soon as they're picked, so this
// just confirms the requirement is met and closes the popup.
function handleSave() {
	if (!totalAttachments.value) return

	toast({
		title: __("Success"),
		text: __("Attachments saved."),
		icon: "check-circle",
		position: "bottom-center",
		iconClasses: "text-green-500",
	})
	emit("close")
}
</script>