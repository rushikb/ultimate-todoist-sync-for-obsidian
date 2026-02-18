import { requestUrl } from 'obsidian';
import type { CustomFetch } from '@doist/todoist-api-typescript';

/**
 * Creates a CustomFetch adapter for Obsidian's requestUrl API.
 * Bridges Obsidian's requestUrl interface to the fetch-like interface
 * expected by the Todoist API SDK v6.
 *
 * Key differences handled:
 * - Obsidian returns response data as properties (response.json, response.text)
 *   while the SDK expects methods (response.json(), response.text())
 * - Obsidian's requestUrl bypasses CORS restrictions
 * - Obsidian throws on HTTP errors by default; we set throw: false
 * - Obsidian doesn't provide statusText; we default to empty string
 */
export function createObsidianFetchAdapter(): CustomFetch {
	return async (url: string, options?: RequestInit & { timeout?: number }) => {
		const requestParams = {
			url,
			method: options?.method || 'GET',
			headers: options?.headers as Record<string, string>,
			body: options?.body as string | undefined,
			throw: false,
		};

		const response = await requestUrl(requestParams);

		return {
			ok: response.status >= 200 && response.status < 300,
			status: response.status,
			statusText: '',
			headers: response.headers,
			text: () => Promise.resolve(response.text),
			json: () => Promise.resolve(response.json),
		};
	};
}
