import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			// Passing options turns off Vercel zero-config mode, which declares two routes per
			// prerendered page and exceeds Vercel's 2048-route limit. vercel.json serves build/ as-is.
			adapter: adapter({ pages: 'build', assets: 'build' }),
			prerender: { concurrency: 8 }
		})
	],
	test: {
		include: ['src/**/*.test.ts']
	}
});
