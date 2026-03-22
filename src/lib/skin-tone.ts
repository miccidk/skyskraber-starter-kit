/**
 * Simplified skin tone processing algorithm based on Skyskraber's
 * HSL-based recoloring system. Detects skin-like pixels in an image
 * and shifts their hue/saturation/lightness based on a skinTone value (0-1).
 */

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) return [0, 0, l];
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h: number;
	if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	else if (max === g) h = ((b - r) / d + 2) / 6;
	else h = ((r - g) / d + 4) / 6;
	return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
	if (s === 0) {
		const v = Math.round(l * 255);
		return [v, v, v];
	}
	const hue2rgb = (p: number, q: number, t: number) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	return [
		Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
		Math.round(hue2rgb(p, q, h) * 255),
		Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
	];
}

function calculateSkinLikelihood(r: number, g: number, b: number): number {
	const colorDifference = Math.max(r, g, b) - Math.min(r, g, b);
	if (r > g && r > b && r > 60 && g > 40 && b > 20 && colorDifference > 15) return 1.0;
	if (r > g && r > b && r > 50 && g > 30 && b > 15 && colorDifference > 10) return 0.5;
	if (r > g && r > b && r > 40 && g > 25 && b > 10 && colorDifference > 5) return 0.2;
	return 0;
}

/**
 * Process an image with skin tone adjustment on a temporary canvas.
 * Returns a canvas with the processed image, leaving the original untouched.
 */
export function processSkinToneImage(
	img: HTMLImageElement | HTMLCanvasElement,
	skinTone: number,
	sourceX = 0,
	sourceY = 0,
	sourceW?: number,
	sourceH?: number,
): HTMLCanvasElement {
	const w =
		sourceW ?? (img instanceof HTMLImageElement ? img.naturalWidth || img.width : img.width);
	const h =
		sourceH ?? (img instanceof HTMLImageElement ? img.naturalHeight || img.height : img.height);

	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	if (!ctx) return canvas;

	ctx.drawImage(img, sourceX, sourceY, w, h, 0, 0, w, h);
	if (skinTone !== 0.5) {
		applySkinTone(ctx, 0, 0, w, h, skinTone);
	}
	return canvas;
}

/**
 * Apply skin tone adjustment to an image on a canvas.
 * skinTone is 0-1, where 0.5 is the neutral default.
 */
export function applySkinTone(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	skinTone: number,
): void {
	if (skinTone === 0.5) return;

	const imageData = ctx.getImageData(x, y, width, height);
	const data = imageData.data;

	const baseHue = 25 / 360;
	const hueRange = 20 / 360;
	const saturationChange = (skinTone - 0.5) * 0.4;
	const lightnessChange = (skinTone - 0.5) * 0.6;
	const blendFactor = 0.8;
	const newH = baseHue + (skinTone - 0.5) * hueRange;

	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3]! === 0) continue;

		const r = data[i]!;
		const g = data[i + 1]!;
		const b = data[i + 2]!;

		const likelihood = calculateSkinLikelihood(r, g, b);
		if (likelihood === 0) continue;

		const [h, s, l] = rgbToHsl(r, g, b);
		const effectiveBlend = blendFactor * likelihood;

		const finalH = h * (1 - effectiveBlend) + newH * effectiveBlend;
		const finalS =
			s * (1 - effectiveBlend) +
			Math.max(0, Math.min(1, s + saturationChange)) * effectiveBlend;
		const finalL =
			l * (1 - effectiveBlend) +
			Math.max(0.1, Math.min(0.9, l + lightnessChange)) * effectiveBlend;

		const [nr, ng, nb] = hslToRgb(finalH, finalS, finalL);
		data[i] = nr;
		data[i + 1] = ng;
		data[i + 2] = nb;
	}

	ctx.putImageData(imageData, x, y);
}
