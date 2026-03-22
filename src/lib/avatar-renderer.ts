import { drawGrid } from '@/lib/draw-grid';
import { getImageUrl, resolveImageUrl } from '@/lib/image';
import { imageLoader } from '@/lib/image-loader';
import { processSkinToneImage } from '@/lib/skin-tone';
import type { AvatarWearableData, WearableImageData } from '@/types/api';

// Match Skyskraber's Avatar engine constants
export const LOGICAL_SIZE = 120;
const AVATAR_X = 60;
const AVATAR_Y = 85;
const AVATAR_PADDING = 5;
const AVATAR_FONT_SIZE = 12;
export const WIDTH_SCALE_FACTOR = 6.222535211267606;
export const HEIGHT_SCALE_FACTOR = 6.223076923076923;
export const THUMBNAIL_GRID_STEP = 3;
export const DISPLAY_GRID_STEP = 5;

interface Layer extends WearableImageData {
	wearableOrder: number;
}

interface AnimatedLayer {
	layer: Layer;
	image: HTMLImageElement;
	currentFrame: number;
	elapsedTime: number;
	/** Cached skin-tone-processed version of the full sprite sheet */
	processedImage: HTMLCanvasElement | null;
}

export interface AvatarRenderState {
	ctx: CanvasRenderingContext2D;
	avatarImg: HTMLImageElement;
	/** Cached skin-tone-processed avatar body */
	processedAvatarImg: HTMLCanvasElement | null;
	isFemale: boolean;
	skinTone: number;
	isDark: boolean;
	showBackground: boolean;
	gridStep: number;
	dpr: number;
	backAnimated: AnimatedLayer[];
	frontAnimated: AnimatedLayer[];
	imageX: number;
	imageY: number;
	scaledWidth: number;
	scaledHeight: number;
	animFrameId: number;
	lastTimestamp: number;
}

export async function initAvatarRender(
	canvas: HTMLCanvasElement,
	sex: string,
	skinTone: number,
	wearables: AvatarWearableData[],
	isDark: boolean,
	showBackground: boolean,
	gridStep: number,
	dpr: number,
): Promise<AvatarRenderState | null> {
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	const isFemale = sex === 'female';
	const avatarUrl = `/avatars/${sex}/happy.png`;

	let avatarImg: HTMLImageElement;
	try {
		avatarImg = await imageLoader.get(resolveImageUrl(avatarUrl));
	} catch {
		return null;
	}

	// Collect layers from wearables
	const allLayers: Layer[] = [];
	if (Array.isArray(wearables)) {
		for (const w of wearables) {
			if (!w || !Array.isArray(w.images)) continue;
			for (const img of w.images) {
				if (!img || (!img.imageUrl && !img.image)) continue;
				allLayers.push({ ...img, wearableOrder: w.order ?? 0 });
			}
		}
	}

	const backLayers = allLayers
		.filter((l) => l.layerType === 'foreground')
		.sort(
			(a, b) =>
				(a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
				(a.wearableOrder ?? 0) - (b.wearableOrder ?? 0),
		);
	const frontLayers = allLayers
		.filter((l) => l.layerType === 'background')
		.sort(
			(a, b) =>
				(a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
				(a.wearableOrder ?? 0) - (b.wearableOrder ?? 0),
		);

	let allImages: HTMLImageElement[] = [];
	try {
		allImages = await Promise.all(
			[...backLayers, ...frontLayers].map((l) => imageLoader.get(getImageUrl(l))),
		);
	} catch {
		// render body only
	}

	if (allImages.length === 0 && (backLayers.length > 0 || frontLayers.length > 0)) {
		backLayers.length = 0;
		frontLayers.length = 0;
	}

	const backImages = allImages.slice(0, backLayers.length);
	const frontImages = allImages.slice(backLayers.length);

	const toAnimated = (layers: Layer[], images: HTMLImageElement[]): AnimatedLayer[] =>
		layers.map((layer, i) => {
			const img = images[i]!;
			return {
				layer,
				image: img,
				currentFrame: 0,
				elapsedTime: 0,
				processedImage:
					layer.needsSkinTone && skinTone !== 0.5
						? processSkinToneImage(img, skinTone)
						: null,
			};
		});

	const targetW = Math.floor(LOGICAL_SIZE * dpr);
	const targetH = Math.floor(LOGICAL_SIZE * dpr);
	if (canvas.width !== targetW || canvas.height !== targetH) {
		canvas.width = targetW;
		canvas.height = targetH;
	}
	const scaledWidth = Math.round(avatarImg.width / WIDTH_SCALE_FACTOR);
	const scaledHeight = Math.round(avatarImg.height / HEIGHT_SCALE_FACTOR);
	const imageX = AVATAR_X - scaledWidth / 2;
	const imageY = AVATAR_Y - (scaledHeight + AVATAR_PADDING + AVATAR_FONT_SIZE) + 40;

	return {
		ctx,
		avatarImg,
		processedAvatarImg: skinTone !== 0.5 ? processSkinToneImage(avatarImg, skinTone) : null,
		isFemale,
		skinTone,
		isDark,
		showBackground,
		gridStep,
		dpr,
		backAnimated: toAnimated(backLayers, backImages),
		frontAnimated: toAnimated(frontLayers, frontImages),
		imageX,
		imageY,
		scaledWidth,
		scaledHeight,
		animFrameId: 0,
		lastTimestamp: 0,
	};
}

export function drawFrame(state: AvatarRenderState): void {
	const { ctx, isDark, showBackground, gridStep, dpr } = state;

	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.clearRect(0, 0, LOGICAL_SIZE, LOGICAL_SIZE);

	if (showBackground) {
		drawGrid(ctx, LOGICAL_SIZE, LOGICAL_SIZE, gridStep, isDark);
	}

	// 1. Back layers (foreground layerType = behind body)
	drawAnimatedLayers(ctx, state.backAnimated, state.isFemale, state.imageX, state.imageY);

	// 2. Avatar body (use cached processed image for skin tone)
	const bodyImg = state.processedAvatarImg ?? state.avatarImg;
	ctx.drawImage(bodyImg, state.imageX, state.imageY, state.scaledWidth, state.scaledHeight);

	// 3. Front layers (background layerType = in front of body)
	drawAnimatedLayers(ctx, state.frontAnimated, state.isFemale, state.imageX, state.imageY);
}

function updateAnimationFrames(layers: AnimatedLayer[], deltaMs: number): boolean {
	let changed = false;
	for (const al of layers) {
		if (al.layer.frames <= 1) continue;
		al.elapsedTime += deltaMs;
		const duration = al.layer.frameDuration || 100;
		const newFrame = Math.floor(al.elapsedTime / duration) % al.layer.frames;
		if (newFrame !== al.currentFrame) {
			al.currentFrame = newFrame;
			changed = true;
		}
	}
	return changed;
}

export function startAnimationLoop(state: AvatarRenderState): void {
	const hasAnimated = [...state.backAnimated, ...state.frontAnimated].some(
		(al) => al.layer.frames > 1,
	);

	// Draw initial frame
	drawFrame(state);

	if (!hasAnimated) return;

	state.lastTimestamp = performance.now();

	const tick = (timestamp: number) => {
		const delta = timestamp - state.lastTimestamp;
		state.lastTimestamp = timestamp;

		const backChanged = updateAnimationFrames(state.backAnimated, delta);
		const frontChanged = updateAnimationFrames(state.frontAnimated, delta);

		if (backChanged || frontChanged) {
			drawFrame(state);
		}

		state.animFrameId = requestAnimationFrame(tick);
	};

	state.animFrameId = requestAnimationFrame(tick);
}

export function stopAnimationLoop(state: AvatarRenderState): void {
	if (state.animFrameId) {
		cancelAnimationFrame(state.animFrameId);
		state.animFrameId = 0;
	}
}

function drawAnimatedLayers(
	ctx: CanvasRenderingContext2D,
	layers: AnimatedLayer[],
	isFemale: boolean,
	bodyX: number,
	bodyY: number,
): void {
	for (const al of layers) {
		const { layer, image: img, currentFrame, processedImage } = al;
		if (!img) continue;

		const ox = isFemale && layer.femaleOffsetX != null ? layer.femaleOffsetX : layer.offsetX;
		const oy = isFemale && layer.femaleOffsetY != null ? layer.femaleOffsetY : layer.offsetY;

		const scale = parseFloat(layer.scale) || 1;
		const frameWidth = layer.frames > 1 ? img.width / layer.frames : img.width;

		const drawW = frameWidth / (WIDTH_SCALE_FACTOR * scale);
		const drawH = img.height / (HEIGHT_SCALE_FACTOR * scale);
		const dx = bodyX - ox;
		const dy = bodyY - oy;

		const sx = currentFrame * frameWidth;

		// Use pre-processed image for skin tone (full sprite sheet was processed at init)
		const source = processedImage ?? img;
		ctx.drawImage(source, sx, 0, frameWidth, img.height, dx, dy, drawW, drawH);
	}
}

export { drawGrid } from '@/lib/draw-grid';
