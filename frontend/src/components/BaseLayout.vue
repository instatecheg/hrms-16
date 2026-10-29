<template>
	<ion-page>
		<ion-header class="ion-no-border">
			<div class="w-full sm:w-96">
				<div class="grid grid-cols-[2.75rem_1fr_2.75rem] items-center bg-[var(--color-surface)] px-4 py-3">
					<router-link :to="{ name: 'Profile' }" class="flex items-center" :aria-label="__('Profile')">
						<Avatar :image="user.data.user_image" :label="user.data.first_name" size="lg" />
					</router-link>

					<h2 class="text-center truncate">
						{{ props.pageTitle || __("Home") }}
					</h2>

					<router-link
						:to="{ name: 'Notifications' }"
						v-slot="{ navigate }"
						class="flex items-center justify-end"
					>
						<button
							class="relative flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-bg-alt)] text-gray-700"
							:aria-label="__('Notifications')"
							@click="navigate"
						>
							<FeatherIcon name="bell" class="h-5 w-5" />
							<span
								v-if="unreadNotificationsCount.data"
								class="absolute top-2 end-2.5 inline-block w-2 h-2 bg-[var(--color-accent)] rounded-full ring-2 ring-white"
							>
							</span>
						</button>
					</router-link>
				</div>
			</div>
		</ion-header>

		<ion-content class="ion-no-padding">
			<ion-refresher v-if="onPull" slot="fixed" @ionRefresh="onPull">
				<ion-refresher-content />
			</ion-refresher>
			<div class="flex flex-col min-h-full w-screen sm:w-96 bg-[var(--color-bg-page)]">
				<slot name="body"></slot>
			</div>
		</ion-content>
	</ion-page>
</template>

<script setup>
import { IonHeader, IonContent, IonPage, IonRefresher, IonRefresherContent } from "@ionic/vue"
import { FeatherIcon, Avatar } from "frappe-ui"

import { unreadNotificationsCount } from "@/data/notifications"
import { usePullToRefresh } from "@/composables/pageRefresh"

import { inject } from "vue"

const user = inject("$user")
const __ = inject("$translate")

// pull-to-refresh, when the page uses usePageRefresh()
const onPull = usePullToRefresh()

const props = defineProps({
	pageTitle: {
		type: String,
		required: false,
		default: "",
	},
})
</script>
