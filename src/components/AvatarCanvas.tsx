import { useEffect, useMemo, useRef } from 'react';

import { useDpr } from '@/hooks/use-dpr';
import { useIsDark } from '@/hooks/use-theme';
import {
	type AvatarRenderState,
	DISPLAY_GRID_STEP,
	drawFrame,
	initAvatarRender,
	LOGICAL_SIZE,
	startAnimationLoop,
	stopAnimationLoop,
} from '@/lib/avatar-renderer';
import { drawGrid } from '@/lib/draw-grid';
import type { AvatarData } from '@/types/api';

/** Draws a pulsing skeleton on the avatar canvas while assets load (matches item/wearable skeleton) */
function drawAvatarSkeleton(
	canvas: HTMLCanvasElement,
	isDark: boolean,
	dpr: number,
	isCancelled: () => boolean,
	onFrame: (id: number) => void,
) {
	canvas.width = Math.floor(LOGICAL_SIZE * dpr);
	canvas.height = Math.floor(LOGICAL_SIZE * dpr);
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	function draw() {
		if (isCancelled()) return;
		const alpha = 0.4 + Math.sin(performance.now() / 800) * 0.15;
		ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx!.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);

		drawGrid(ctx!, LOGICAL_SIZE, LOGICAL_SIZE, DISPLAY_GRID_STEP, isDark);

		const skelSize = Math.round(LOGICAL_SIZE * 0.4);
		const x = Math.round((LOGICAL_SIZE - skelSize) / 2);
		const y = Math.round((LOGICAL_SIZE - skelSize) / 2);
		ctx!.fillStyle = isDark ? `rgba(148, 163, 184, ${alpha})` : `rgba(203, 213, 225, ${alpha})`;
		ctx!.beginPath();
		ctx!.roundRect(x, y, skelSize, skelSize, 4);
		ctx!.fill();

		onFrame(requestAnimationFrame(draw));
	}
	draw();
}

/**
 * Renders an avatar on a <canvas> element using the layered asset data.
 * Matches Skyskraber's AvatarDisplay component (120x120 logical pixels)
 * with animated wearables.
 */
export function AvatarCanvas({ data, size = 120 }: { data: AvatarData; size?: number }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const stateRef = useRef<AvatarRenderState | null>(null);
	const skelRef = useRef<number>(0);
	const isDark = useIsDark();
	const dpr = useDpr();

	// Stable content key — prevents re-init when data reference changes but content is identical
	const dataKey = useMemo(() => JSON.stringify(data), [data]);
	const dataRef = useRef(data);
	useEffect(() => {
		dataRef.current = data;
	}, [data]);

	// Initialize avatar rendering
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		let cancelled = false;
		const d = dataRef.current;
		const skinTone = typeof d.skinTone === 'string' ? parseFloat(d.skinTone) : d.skinTone;

		// Start skeleton animation while assets load
		drawAvatarSkeleton(
			canvas,
			isDark,
			dpr,
			() => cancelled,
			(id) => {
				skelRef.current = id;
			},
		);

		void initAvatarRender(
			canvas,
			d.sex,
			skinTone,
			d.wearables ?? [],
			isDark,
			true,
			DISPLAY_GRID_STEP,
			dpr,
		).then((state) => {
			if (cancelled || !state) return;
			// Cancel skeleton animation
			if (skelRef.current) cancelAnimationFrame(skelRef.current);
			canvas.style.width = `${size}px`;
			canvas.style.height = `${size}px`;
			stateRef.current = state;
			startAnimationLoop(state);
		});

		return () => {
			cancelled = true;
			if (skelRef.current) cancelAnimationFrame(skelRef.current);
			if (stateRef.current) {
				stopAnimationLoop(stateRef.current);
				stateRef.current = null;
			}
		};
	}, [dataKey, size, isDark, dpr]);

	// Handle DPR changes on existing state without full re-init
	useEffect(() => {
		const state = stateRef.current;
		const canvas = canvasRef.current;
		if (!state || !canvas) return;

		const targetW = Math.floor(LOGICAL_SIZE * dpr);
		const targetH = Math.floor(LOGICAL_SIZE * dpr);
		if (canvas.width !== targetW || canvas.height !== targetH) {
			canvas.width = targetW;
			canvas.height = targetH;
		}
		state.dpr = dpr;
		drawFrame(state);
	}, [dpr]);

	return (
		<div style={{ width: size, height: size }}>
			<canvas ref={canvasRef} style={{ width: size, height: size }} />
		</div>
	);
}
