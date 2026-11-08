import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter(),
			prerender: { concurrency: 8 }
		})
	],
	test: {
		include: ['src/**/*.test.ts']
	}
});
