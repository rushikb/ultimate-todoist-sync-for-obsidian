import { TodoistApi } from "@doist/todoist-api-typescript";
import type { GetActivityLogsArgs } from "@doist/todoist-api-typescript";
import { App, requestUrl } from 'obsidian';
import UltimateTodoistSyncForObsidian from "../main";
import { createObsidianFetchAdapter } from "./obsidianFetchAdapter";


export type Event = {
  id: string | number | null;
  objectType: string;
  objectId: string;
  eventType: string;
  eventDate: string;
  parentProjectId: string | null;
  parentItemId: string | null;
  initiatorId: string | null;
  extraData: Record<string, unknown> | null;
};

export type FilterOptions = {
  eventType?: string;
  objectType?: string;
};

export class TodoistSyncAPI {
	app: App;
	plugin: UltimateTodoistSyncForObsidian;
	api: TodoistApi | null;

	constructor(app: App, plugin: UltimateTodoistSyncForObsidian) {
		this.app = app;
		this.plugin = plugin;
		this.api = null;
	}

	initializeAPI(): TodoistApi {
		const token = this.plugin.settings.todoistAPIToken;
		this.api = new TodoistApi(token, {
			customFetch: createObsidianFetchAdapter(),
		});
		return this.api;
	}

	private getAPI(): TodoistApi {
		if (!this.api) {
			return this.initializeAPI();
		}
		return this.api;
	}

	/**
	 * Collect all paginated activity log results into a single array.
	 * Keeps calling getActivityLogs with the nextCursor until all pages are fetched.
	 */
	private async getAllPaginatedActivityLogs(args?: GetActivityLogsArgs): Promise<Event[]> {
		const api = this.getAPI();
		const allEvents: Event[] = [];
		let cursor: string | null | undefined = undefined;

		do {
			const requestArgs: GetActivityLogsArgs = {
				...args,
				...(cursor ? { cursor } : {}),
			};

			const response = await api.getActivityLogs(requestArgs);

			for (const activityEvent of response.results) {
				allEvents.push({
					id: activityEvent.id,
					objectType: activityEvent.objectType,
					objectId: activityEvent.objectId,
					eventType: activityEvent.eventType,
					eventDate: activityEvent.eventDate,
					parentProjectId: activityEvent.parentProjectId,
					parentItemId: activityEvent.parentItemId,
					initiatorId: activityEvent.initiatorId,
					extraData: activityEvent.extraData,
				});
			}

			cursor = response.nextCursor;
		} while (cursor);

		return allEvents;
	}

	// backup todoist - uses Obsidian's requestUrl since the v6 client does not wrap /sync/v9/sync
	async getAllResources() {
		const accessToken = this.plugin.settings.todoistAPIToken;
		const url = 'https://api.todoist.com/sync/v9/sync';

		try {
			const response = await requestUrl({
				url,
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					sync_token: "*",
					resource_types: '["all"]'
				}).toString(),
				throw: false,
			});

			if (response.status < 200 || response.status >= 300) {
				throw new Error(`Failed to fetch all resources: ${response.status}`);
			}

			return response.json;
		} catch (error) {
			console.error(error);
			throw new Error('Failed to fetch all resources due to network error');
		}
	}

	// get all activity events using the v6 client
	async getAllActivityEvents(): Promise<Event[]> {
		try {
			const events = await this.getAllPaginatedActivityLogs();
			return events;
		} catch (error) {
			throw error;
		}
	}

	// get all activity events that did NOT originate from obsidian
	async getNonObsidianAllActivityEvents(): Promise<Event[]> {
		try {
			const allActivityEvents = await this.getAllActivityEvents();
			// filter out events where extraData.client includes "obsidian"
			const filteredArray = allActivityEvents.filter(obj => {
				const client = obj.extraData && (obj.extraData.client as string);
				return !client || !client.includes("obsidian");
			});
			return filteredArray;
		} catch (err) {
			console.error('An error occurred:', err);
			return [];
		}
	}

	// filter activity events by eventType and/or objectType
	filterActivityEvents(events: Event[], options: FilterOptions): Event[] {
		return events.filter(event =>
			(options.eventType ? event.eventType === options.eventType : true) &&
			(options.objectType ? event.objectType === options.objectType : true)
		);
	}

	// get completed items activity using v6 client
	async getCompletedItemsActivity(): Promise<Event[]> {
		try {
			const events = await this.getAllPaginatedActivityLogs({
				objectType: 'item',
				eventType: 'completed',
			});
			return events;
		} catch (error) {
			console.error(error);
			throw new Error('Failed to fetch completed items due to network error');
		}
	}

	// get uncompleted items activity using v6 client
	async getUncompletedItemsActivity(): Promise<Event[]> {
		try {
			const events = await this.getAllPaginatedActivityLogs({
				objectType: 'item',
				eventType: 'uncompleted',
			});
			return events;
		} catch (error) {
			console.error(error);
			throw new Error('Failed to fetch uncompleted items due to network error');
		}
	}

	// get updated items activity using v6 client
	async getUpdatedItemsActivity(): Promise<Event[]> {
		try {
			const events = await this.getAllPaginatedActivityLogs({
				objectType: 'item',
				eventType: 'updated',
			});
			return events;
		} catch (error) {
			console.error(error);
			throw new Error('Failed to fetch updated items due to network error');
		}
	}

	// get non-obsidian completed event
	async getNonObsidianCompletedItemsActivity(): Promise<Event[]> {
		const completedItemsActivityEvents = await this.getCompletedItemsActivity();
		// filter out events where extraData.client includes "obsidian"
		const filteredArray = completedItemsActivityEvents.filter(obj => {
			const client = obj.extraData && (obj.extraData.client as string);
			return !client || !client.includes("obsidian");
		});
		return filteredArray;
	}

	// get non-obsidian uncompleted event
	async getNonObsidianUncompletedItemsActivity(): Promise<Event[]> {
		const uncompletedItemsActivityEvents = await this.getUncompletedItemsActivity();
		// filter out events where extraData.client includes "obsidian"
		const filteredArray = uncompletedItemsActivityEvents.filter(obj => {
			const client = obj.extraData && (obj.extraData.client as string);
			return !client || !client.includes("obsidian");
		});
		return filteredArray;
	}

	// get non-obsidian updated event
	async getNonObsidianUpdatedItemsActivity(): Promise<Event[]> {
		const updatedItemsActivityEvents = await this.getUpdatedItemsActivity();
		// filter out events where extraData.client includes "obsidian"
		const filteredArray = updatedItemsActivityEvents.filter(obj => {
			const client = obj.extraData && (obj.extraData.client as string);
			return !client || !client.includes("obsidian");
		});
		return filteredArray;
	}

	// get projects activity using v6 client
	async getProjectsActivity(): Promise<Event[]> {
		try {
			const events = await this.getAllPaginatedActivityLogs({
				objectType: 'project',
			});
			return events;
		} catch (error) {
			console.error(error);
			throw new Error('Failed to fetch projects activities due to network error');
		}
	}
}
