import { memo, useEffect, useRef } from 'react';

import { useDpr } from '@/hooks/use-dpr';
import { useIsDark } from '@/hooks/use-theme';
import { HEIGHT_SCALE_FACTOR,WIDTH_SCALE_FACTOR } from '@/lib/avatar-renderer';
import { drawGrid } from '@/lib/draw-grid';
import { getImageUrl } from '@/lib/image';
import { imageLoader } from '@/lib/image-loader';
import type { AssetImage } from '@/types/api';

// Room size used for background-type item frame derivation
const ROOM_WIDTH = 476;

const THUMBNAIL_GRID_STEP = 3;
const DISPLAY_GRID_STEP = 5;
const PADDING = 5;

// Fallback images for special item types that have no asset images
const SPECIAL_ITEM_FALLBACKS: Record<string, { image: string; scale: number }> = {
	robot: { image: '/avatars/robot.png', scale: WIDTH_SCALE_FACTOR },
	dice: { image: '/items/dice-1.png', scale: 6 },
	'kick-kon-button': { image: '/items/kick-kon.png', scale: 3.8 },
	background: { image: '/items/bg.png', scale: 2.4 },
};

function resolveImages(images: AssetImage[], type?: string): AssetImage[] {
	if (images.length > 0) return images;
	if (!type) return images;
	const fallback = SPECIAL_ITEM_FALLBACKS[type];
	if (!fallback) return images;
	return [
		{
			imageUrl: fallback.image,
			layerType: 'background',
			frames: 1,
			frameDuration: 0,
			scale: String(fallback.scale),
			offsetX: 0,
			offsetY: 0,
			sortOrder: 0,
		},
	];
}

/**
 * Derive actual frame count from image dimensions.
 * For sprite sheets, the expected frame width is ROOM_WIDTH * scale.
 * For single images (WebP or non-spritesheet), returns 1.
 */
function deriveFrames(img: HTMLImageElement, scale: number): number {
	const expectedFrameWidth = ROOM_WIDTH * scale;
	const derived = Math.max(1, Math.round(img.width / expectedFrameWidth));
	return derived;
}

interface ItemCanvasProps {
	images: AssetImage[];
	type?: string;
	size?: number;
	showBackground?: boolean;
	animate?: boolean;
}

/** Draws a pulsing skeleton rectangle on the canvas while images load */
function drawSkeleton(
	canvas: HTMLCanvasElement,
	size: number,
	isDark: boolean,
	dpr: number,
	isCancelled: () => boolean,
	onFrame: (id: number) => void,
) {
	canvas.width = Math.floor(size * dpr);
	canvas.height = Math.floor(size * dpr);
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	const step = size < 60 ? THUMBNAIL_GRID_STEP : DISPLAY_GRID_STEP;

	function draw() {
		if (isCancelled()) return;
		const alpha = 0.4 + Math.sin(performance.now() / 800) * 0.15;
		ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx!.clearRect(0, 0, size, size);

		drawGrid(ctx!, size, size, step, isDark);

		const skelSize = Math.round(size * 0.4);
		const x = Math.round((size - skelSize) / 2);
		const y = Math.round((size - skelSize) / 2);
		ctx!.fillStyle = isDark ? `rgba(148, 163, 184, ${alpha})` : `rgba(203, 213, 225, ${alpha})`;
		ctx!.beginPath();
		ctx!.roundRect(x, y, skelSize, skelSize, 4);
		ctx!.fill();

		onFrame(requestAnimationFrame(draw));
	}
	draw();
}

export const ItemCanvas = memo(function ItemCanvas({
	images: rawImages,
	type,
	size = 60,
	showBackground = true,
	animate = true,
}: ItemCanvasProps) {
	const images = resolveImages(rawImages, type);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animRef = useRef<number>(0);
	const skelRef = useRef<number>(0);
	const isDark = useIsDark();
	const dpr = useDpr();

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || images.length === 0) return;

		let cancelled = false;
		let loaded = false;

		// Start skeleton animation immediately while images load
		drawSkeleton(
			canvas,
			size,
			isDark,
			dpr,
			() => cancelled || loaded,
			(id) => {
				skelRef.current = id;
			},
		);

		void renderItem(
			canvas,
			images,
			size,
			showBackground,
			animate,
			isDark,
			dpr,
			type,
			() => cancelled,
			(id) => {
				// Cancel skeleton when first real frame draws
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
	}, [images, size, showBackground, animate, isDark, dpr, type]);

	if (images.length === 0) {
		return (
			<div
				className="flex items-center justify-center rounded bg-slate-100 text-xs text-slate-400 dark:bg-slate-700"
				style={{ width: size, height: size }}
			>
				?
			</div>
		);
	}

	return <canvas ref={canvasRef} className="rounded" style={{ width: size, height: size }} />;
});

interface LayerInfo {
	layer: AssetImage;
	image: HTMLImageElement;
	actualFrames: number;
	frameWidth: number;
}

async function renderItem(
	canvas: HTMLCanvasElement,
	images: AssetImage[],
	displaySize: number,
	showBackground: boolean,
	animate: boolean,
	isDark: boolean,
	dpr: number,
	type: string | undefined,
	isCancelled: () => boolean,
	onAnimFrame: (id: number) => void,
): Promise<void> {
	const maybeCtx = canvas.getContext('2d');
	if (!maybeCtx) return;
	const ctx = maybeCtx;
	ctx.imageSmoothingEnabled = false;

	const isBackgroundType = type === 'background';

	// Separate and sort layers
	const foregroundLayers = images
		.filter((img) => img.layerType === 'foreground')
		.sort((a, b) => a.sortOrder - b.sortOrder);
	const backgroundLayers = images
		.filter((img) => img.layerType === 'background')
		.sort((a, b) => a.sortOrder - b.sortOrder);

	const allLayers = [...foregroundLayers, ...backgroundLayers];
	const loadedImages = await Promise.all(
		allLayers.map((layer) => imageLoader.get(getImageUrl(layer)).catch(() => null)),
	);
	if (isCancelled()) return;

	// Build layer info with derived frame counts
	const layerInfos: (LayerInfo | null)[] = allLayers.map((layer, i) => {
		const img = loadedImages[i];
		if (!img) return null;

		const scale = parseFloat(layer.scale) || 1;
		// For background-type items, derive frame count from image dimensions
		// (sprite sheets are ROOM_WIDTH * scale per frame). For all other items,
		// trust the API frame count — ROOM_WIDTH is irrelevant for wearables/items.
		const actualFrames = isBackgroundType ? deriveFrames(img, scale) : layer.frames || 1;
		const frameWidth = img.width / actualFrames;

		return { layer, image: img, actualFrames, frameWidth };
	});

	const fgInfos = layerInfos.slice(0, foregroundLayers.length);
	const bgInfos = layerInfos.slice(foregroundLayers.length);

	// Primary background image determines canvas sizing
	const primaryInfo = bgInfos[0] ?? null;
	const primaryLayer = backgroundLayers[0];

	const primaryScale = parseFloat(primaryLayer?.scale ?? '1') || 1;
	let canvasW = displaySize;
	let canvasH = displaySize;
	let zoomFactor = 1;

	if (primaryInfo && primaryLayer) {
		const rawFrameWidth = primaryInfo.frameWidth;
		const rawFrameHeight = primaryInfo.image.height;

		const intrinsicW = rawFrameWidth / primaryScale;
		const intrinsicH = rawFrameHeight / primaryScale;

		const safePadding =
			displaySize < 100 ? Math.max(2, Math.floor(displaySize * 0.1)) : PADDING;
		const availW = displaySize - safePadding * 2;
		const availH = displaySize - safePadding * 2;
		const maxRatio = Math.max(intrinsicW / availW, intrinsicH / availH);
		zoomFactor = maxRatio > 1 ? 1 / maxRatio : 1;

		const displayedW = intrinsicW * zoomFactor;
		const displayedH = intrinsicH * zoomFactor;
		canvasW = Math.max(displaySize, displayedW + safePadding * 2);
		canvasH = Math.max(displaySize, displayedH + safePadding * 2);
	}

	// Set up canvas with DPR scaling
	canvas.width = Math.floor(canvasW * dpr);
	canvas.height = Math.floor(canvasH * dpr);
	canvas.style.width = `${displaySize}px`;
	canvas.style.height = `${displaySize}px`;

	const primaryOffsetX = primaryLayer?.offsetX ?? 0;
	const primaryOffsetY = primaryLayer?.offsetY ?? 0;
	const primaryEffectiveScale = primaryScale / zoomFactor;

	const hasAnimation = animate && layerInfos.some((li) => li && li.actualFrames > 1);
	let lastTime = 0;
	const fgLen = foregroundLayers.length;
	const frameTimes = allLayers.map(() => 0);
	const frameIndices = allLayers.map(() => 0);

	function draw(time: number) {
		if (isCancelled()) return;

		const delta = time - lastTime;
		lastTime = time;

		// Update all animation frames
		if (delta > 0) {
			for (let i = 0; i < allLayers.length; i++) {
				const info = layerInfos[i];
				if (!info || info.actualFrames <= 1) continue;
				frameTimes[i] = (frameTimes[i] ?? 0) + delta;
				const dur = info.layer.frameDuration || 100;
				if ((frameTimes[i] ?? 0) >= dur) {
					frameIndices[i] = ((frameIndices[i] ?? 0) + 1) % info.actualFrames;
					frameTimes[i] = 0;
				}
			}
		}

		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, canvasW, canvasH);

		if (showBackground) {
			const step = displaySize < 60 ? THUMBNAIL_GRID_STEP : DISPLAY_GRID_STEP;
			drawGrid(ctx, canvasW, canvasH, step, isDark);
		}

		const centerX = canvasW / 2;
		const centerY = canvasH / 2;

		// Primary draw dimensions and top-left position (centered in canvas)
		const primaryDrawW = primaryInfo ? primaryInfo.frameWidth / primaryEffectiveScale : 0;
		const primaryDrawH = primaryInfo ? primaryInfo.image.height / primaryEffectiveScale : 0;
		const primaryLeft = centerX - primaryDrawW / 2;
		const primaryTop = centerY - primaryDrawH / 2;
		const primaryFrameW = primaryInfo?.frameWidth ?? 1;
		const primaryFrameH = primaryInfo?.image.height ?? 1;

		// Uniform display scale: maps from primary sprite-pixels to display-pixels
		const displayScale = primaryFrameW > 0 ? primaryDrawW / primaryFrameW : 1;

		// 1. Draw foreground layers (behind primary, matching avatar back-layer order)
		for (let i = 0; i < foregroundLayers.length; i++) {
			const info = fgInfos[i];
			if (!info) continue;
			drawExtraLayer(
				ctx,
				info,
				primaryLeft,
				primaryTop,
				primaryOffsetX,
				primaryOffsetY,
				primaryDrawW,
				primaryDrawH,
				primaryFrameW,
				primaryFrameH,
				displayScale,
				frameIndices[i] ?? 0,
			);
		}

		// 2. Draw extra background layers (behind primary)
		for (let i = 1; i < backgroundLayers.length; i++) {
			const info = bgInfos[i];
			if (!info) continue;
			drawExtraLayer(
				ctx,
				info,
				primaryLeft,
				primaryTop,
				primaryOffsetX,
				primaryOffsetY,
				primaryDrawW,
				primaryDrawH,
				primaryFrameW,
				primaryFrameH,
				displayScale,
				frameIndices[fgLen + i] ?? 0,
			);
		}

		// 3. Draw primary background layer (centered)
		if (primaryInfo) {
			const frame = (frameIndices[fgLen] ?? 0) % primaryInfo.actualFrames;
			const srcX = frame * primaryInfo.frameWidth;
			ctx.drawImage(
				primaryInfo.image,
				srcX,
				0,
				primaryInfo.frameWidth,
				primaryInfo.image.height,
				primaryLeft,
				primaryTop,
				primaryDrawW,
				primaryDrawH,
			);
		}

		if (hasAnimation) {
			onAnimFrame(requestAnimationFrame(draw));
		}
	}

	// Signal loaded even for static (non-animated) items
	onAnimFrame(0);
	draw(0);
	if (hasAnimation) {
		lastTime = performance.now();
		onAnimFrame(requestAnimationFrame(draw));
	}
}

function drawExtraLayer(
	ctx: CanvasRenderingContext2D,
	info: LayerInfo,
	primaryLeft: number,
	primaryTop: number,
	primaryOffsetX: number,
	primaryOffsetY: number,
	primaryDrawW: number,
	primaryDrawH: number,
	primaryFrameW: number,
	primaryFrameH: number,
	displayScale: number,
	frameIndex: number,
): void {
	const { layer, image: img, actualFrames, frameWidth: rawFrameWidth } = info;

	// Uniform sizing: all layers use the same display scale as the primary
	const lw = rawFrameWidth * displayScale;
	const lh = img.height * displayScale;

	// Convert avatar-space relative offset to display-space
	// Reference: wearable-display.ts — (primaryOffset - layerOffset) * (drawDim * scaleFactor / frameDim)
	const relOffsetX =
		(primaryOffsetX - layer.offsetX) * ((primaryDrawW * WIDTH_SCALE_FACTOR) / primaryFrameW);
	const relOffsetY =
		(primaryOffsetY - layer.offsetY) * ((primaryDrawH * HEIGHT_SCALE_FACTOR) / primaryFrameH);

	// Position relative to primary's top-left corner
	const lx = primaryLeft + relOffsetX;
	const ly = primaryTop + relOffsetY;

	const frame = frameIndex % actualFrames;
	const srcX = frame * rawFrameWidth;

	ctx.drawImage(img, srcX, 0, rawFrameWidth, img.height, lx, ly, lw, lh);
}

