<template>
	<div class="relative">
		<input
			v-model="query"
			type="text"
			:disabled="disabled"
			:placeholder="placeholder"
			class="w-full rounded border border-[var(--color-card-border)] text-sm p-2 bg-white text-gray-700 disabled:bg-[var(--color-card-bg)] disabled:text-gray-500"
			@input="onInput"
			@focus="onFocus"
			@blur="onBlur"
		/>

		<div
			v-if="showResults && results.length"
			class="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[var(--color-card-border)] rounded shadow-md max-h-48 overflow-y-auto"
		>
			<div
				v-for="option in results"
				:key="option"
				class="px-3 py-2 text-sm text-gray-700 hover:bg-[var(--color-card-bg)] cursor-pointer"
				@mousedown.prevent="select(option)"
			>
				{{ option }}
			</div>
		</div>

		<div
			v-else-if="showResults && searching"
			class="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[var(--color-card-border)] rounded shadow-md px-3 py-2 text-sm text-gray-400"
		>
			{{ __("Searching...") }}
		</div>
	</div>
</template>

<script setup>
import { ref, watch, inject } from "vue"
import { call } from "frappe-ui"

const __ = inject("$translate")

const props = defineProps({
	modelValue: {
		type: String,
		default: "",
	},
	doctype: {
		type: String,
		required: true,
	},
	placeholder: {
		type: String,
		default: "",
	},
	disabled: {
		type: Boolean,
		default: false,
	},
})

const emit = defineEmits(["update:modelValue"])

const query = ref(props.modelValue || "")
const results = ref([])
const showResults = ref(false)
const searching = ref(false)

let debounceTimer = null

watch(
	() => props.modelValue,
	(val) => {
		if (val !== query.value) query.value = val || ""
	}
)

function onInput() {
	emit("update:modelValue", query.value)

	clearTimeout(debounceTimer)
	if (!query.value) {
		results.value = []
		return
	}

	debounceTimer = setTimeout(search, 300)
}

async function search() {
	searching.value = true
	try {
		const data = await call("frappe.client.get_list", {
			doctype: props.doctype,
			filters: { name: ["like", `%${query.value}%`] },
			fields: ["name"],
			limit_page_length: 20,
		})
		results.value = data.map((d) => d.name)
	} finally {
		searching.value = false
	}
}

function onFocus() {
	showResults.value = true
	if (query.value) search()
}

function onBlur() {
	// slight delay so a click on a result registers before the list closes
	setTimeout(() => {
		showResults.value = false
	}, 150)
}

function select(option) {
	query.value = option
	emit("update:modelValue", option)
	showResults.value = false
}
</script>