/**
 * Shared grid background used by AvatarCanvas, ItemCanvas, and RoomCanvas.
 * Draws the Skyskraber-style blueprint grid with inner/outer borders.
 */
export function drawGrid(
	ctx: CanvasRenderingContext2D,
	w: number,
	h: number,
	gridStep: number,
	isDark: boolean,
): void {
	ctx.fillStyle = isDark ? '#0F172A' : '#E0F2FE';
	ctx.fillRect(0, 0, w, h);

	ctx.strokeStyle = isDark ? '#334155' : '#BAE6FD';
	ctx.lineWidth = 0.5;
	for (let x = 0; x <= w; x += gridStep) {
		ctx.beginPath();
		ctx.moveTo(x, 0);
		ctx.lineTo(x, h);
		ctx.stroke();
	}
	for (let y = 0; y <= h; y += gridStep) {
		ctx.beginPath();
		ctx.moveTo(0, y);
		ctx.lineTo(w, y);
		ctx.stroke();
	}

	ctx.lineWidth = 1;
	ctx.strokeStyle = isDark ? '#475569' : '#7DD3FC';
	ctx.strokeRect(1, 1, w - 2, h - 2);
	ctx.strokeStyle = isDark ? '#1E293B' : '#FFFFFF';
	ctx.strokeRect(2, 2, w - 4, h - 4);
}
