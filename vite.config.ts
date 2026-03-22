import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		TanStackRouterVite({
			autoCodeSplitting: true,
		}),
		react(),
		tailwindcss(),
	],
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
		},
	},
	build: {
		target: 'es2022',
		cssMinify: true,
		cssCodeSplit: true,
		sourcemap: 'hidden',
	},
	server: {
		port: 5180,
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true,
			},
			'/avatars': {
				target: 'http://localhost:3001',
				changeOrigin: true,
			},
			'/items': {
				target: 'http://localhost:3001',
				changeOrigin: true,
			},
		},
	},
});
