import { memo, useEffect, useRef } from 'react';

import { useDpr } from '@/hooks/use-dpr';
import { useIsDark } from '@/hooks/use-theme';
import { drawGrid } from '@/lib/draw-grid';
import { getImageUrl } from '@/lib/image';
import { imageLoader } from '@/lib/image-loader';
import type { AssetImage } from '@/types/api';

// Match Skyskraber's room size constants
const ROOM_WIDTH = 476;
const ROOM_HEIGHT = 408;
const ROOM_ASPECT = ROOM_WIDTH / ROOM_HEIGHT;
const THUMBNAIL_GRID_STEP = 3;
const DISPLAY_GRID_STEP = 5;

interface RoomCanvasProps {
	images: AssetImage[];
	width?: number;
}

interface LayerState {
	layer: AssetImage;
	image: HTMLImageElement;
	currentFrame: number;
	elapsedTime: number;
	actualFrames: number;
}

/** Draws a gradient skeleton with a horizontal shimmer sweep while room images load.
 *  Matches the reference Background._drawSkeleton exactly. */
function drawRoomSkeleton(
	canvas: HTMLCanvasElement,
	w: number,
	h: number,
	isDark: boolean,
	dpr: number,
	isCancelled: () => boolean,
	onFrame: (id: number) => void,
) {
	canvas.width = Math.floor(w * dpr);
	canvas.height = Math.floor(h * dpr);
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	function draw() {
		if (isCancelled()) return;
		ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx!.clearRect(0, 0, w, h);

		// Vertical gradient background
		const grad = ctx!.createLinearGradient(0, 0, 0, h);
		if (isDark) {
			grad.addColorStop(0, '#334155');
			grad.addColorStop(0.7, '#1e293b');
			grad.addColorStop(1, '#0f172a');
		} else {
			grad.addColorStop(0, '#ebf8ff');
			grad.addColorStop(0.7, '#f5f9ff');
			grad.addColorStop(1, '#ffffff');
		}
		ctx!.fillStyle = grad;
		ctx!.fillRect(0, 0, w, h);

		// Horizontal shimmer sweep
		const t = performance.now();
		const shimmerX = ((t % 2000) / 2000) * (w + 200) - 200;
		const shimmerGrad = ctx!.createLinearGradient(shimmerX, 0, shimmerX + 200, 0);
		const shimmerColor = isDark ? '255, 255, 255' : '0, 0, 0';
		shimmerGrad.addColorStop(0, `rgba(${shimmerColor}, 0)`);
		shimmerGrad.addColorStop(0.5, `rgba(${shimmerColor}, 0.04)`);
		shimmerGrad.addColorStop(1, `rgba(${shimmerColor}, 0)`);
		ctx!.fillStyle = shimmerGrad;
		ctx!.fillRect(0, 0, w, h);

		onFrame(requestAnimationFrame(draw));
	}
	draw();
}

export const RoomCanvas = memo(function RoomCanvas({
	images,
	width: displayWidth = 40,
}: RoomCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animRef = useRef<number>(0);
	const skelRef = useRef<number>(0);
	const isDark = useIsDark();
	const dpr = useDpr();

	const displayHeight = Math.round(displayWidth / ROOM_ASPECT);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || images.length === 0) return;

		let cancelled = false;
		let loaded = false;

		// Start pulsing skeleton while images load
		drawRoomSkeleton(
			canvas,
			displayWidth,
			displayHeight,
			isDark,
			dpr,
			() => cancelled || loaded,
			(id) => {
				skelRef.current = id;
			},
		);

		void renderRoom(
			canvas,
			images,
			displayWidth,
			displayHeight,
			isDark,
			dpr,
			() => cancelled,
			(id) => {
				if (!loaded) {
					loaded = true;
					cancelAnimationFrame(skelRef.current);
				}
				animRef.current = id;
			},
		);

		return () => {
			cancelled = true;
			cancelAnimationFrame(skelRef.current);
			cancelAnimationFrame(animRef.current);
		};
	}, [images, displayWidth, displayHeight, isDark, dpr]);

	if (images.length === 0) {
		return (
			<div
				className="flex items-center justify-center rounded bg-slate-100 text-xs text-slate-400 dark:bg-slate-700 flex-shrink-0"
				style={{ width: displayWidth, height: displayHeight }}
			>
				?
			</div>
		);
	}

	return (
		<canvas
			ref={canvasRef}
			className="rounded flex-shrink-0"
			style={{ width: displayWidth, height: displayHeight }}
		/>
	);
});

async function renderRoom(
	canvas: HTMLCanvasElement,
	images: AssetImage[],
	displayWidth: number,
	displayHeight: number,
	isDark: boolean,
	dpr: number,
	isCancelled: () => boolean,
	onAnimFrame: (id: number) => void,
): Promise<void> {
	const maybeCtx = canvas.getContext('2d');
	if (!maybeCtx) return;
	const ctx = maybeCtx;

	// Separate and sort layers
	const bgLayers = images
		.filter((img) => img.layerType === 'background')
		.sort((a, b) => a.sortOrder - b.sortOrder);
	const fgLayers = images
		.filter((img) => img.layerType === 'foreground')
		.sort((a, b) => a.sortOrder - b.sortOrder);

	const allLayers = [...bgLayers, ...fgLayers];
	const loadedImages = await Promise.all(
		allLayers.map((layer) => imageLoader.get(getImageUrl(layer)).catch(() => null)),
	);
	if (isCancelled()) return;

	const layerStates: LayerState[] = [];
	for (let i = 0; i < allLayers.length; i++) {
		const img = loadedImages[i];
		if (!img) continue;
		// Derive actual frame count from image dimensions (handles WebP vs PNG sprite sheets)
		const scale = parseFloat(allLayers[i]!.scale) || 1;
		const expectedFrameWidth = ROOM_WIDTH * scale;
		const actualFrames = Math.max(1, Math.round(img.width / expectedFrameWidth));
		layerStates.push({
			layer: allLayers[i]!,
			image: img,
			currentFrame: 0,
			elapsedTime: 0,
			actualFrames,
		});
	}

	// Set up canvas with DPR scaling
	canvas.width = Math.floor(displayWidth * dpr);
	canvas.height = Math.floor(displayHeight * dpr);

	const isThumbnail = displayWidth <= 100;
	const gridStep = isThumbnail ? THUMBNAIL_GRID_STEP : DISPLAY_GRID_STEP;
	const hasAnimation = layerStates.some((ls) => ls.actualFrames > 1);
	let lastTime = 0;

	function draw(time: number) {
		if (isCancelled()) return;

		const delta = time - lastTime;
		lastTime = time;

		// Update animation frames
		if (delta > 0) {
			for (const ls of layerStates) {
				if (ls.actualFrames <= 1) continue;
				ls.elapsedTime += delta;
				const dur = ls.layer.frameDuration || 100;
				const newFrame = Math.floor(ls.elapsedTime / dur) % ls.actualFrames;
				if (newFrame !== ls.currentFrame) {
					ls.currentFrame = newFrame;
				}
			}
		}

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, displayWidth, displayHeight);

		// Grid background
		drawGrid(ctx, displayWidth, displayHeight, gridStep, isDark);

		// Scale to fit room into display size with smooth rendering
		ctx.save();
		ctx.imageSmoothingEnabled = true;
		if ('imageSmoothingQuality' in ctx) {
			ctx.imageSmoothingQuality = 'high';
		}
		ctx.scale(displayWidth / ROOM_WIDTH, displayHeight / ROOM_HEIGHT);

		// Draw all layers
		for (const ls of layerStates) {
			if (ls.actualFrames <= 1) {
				// Single image (WebP or single-frame PNG): draw full image to fill room
				ctx.drawImage(
					ls.image,
					0,
					0,
					ls.image.width,
					ls.image.height,
					0,
					0,
					ROOM_WIDTH,
					ROOM_HEIGHT,
				);
			} else {
				// PNG sprite sheet: extract current frame using scale
				const scale = parseFloat(ls.layer.scale) || 1;
				const sourceWidth = ROOM_WIDTH * scale;
				const sourceHeight = ROOM_HEIGHT * scale;
				const sourceX = ls.currentFrame * sourceWidth;

				ctx.drawImage(
					ls.image,
					sourceX,
					0,
					sourceWidth,
					sourceHeight,
					0,
					0,
					ROOM_WIDTH,
					ROOM_HEIGHT,
				);
			}
		}

		ctx.restore();

		if (hasAnimation) {
			onAnimFrame(requestAnimationFrame(draw));
		}
	}

	// Signal loaded even for static (non-animated) rooms
	onAnimFrame(0);
	draw(0);
	if (hasAnimation) {
		lastTime = performance.now();
		onAnimFrame(requestAnimationFrame(draw));
	}
}

