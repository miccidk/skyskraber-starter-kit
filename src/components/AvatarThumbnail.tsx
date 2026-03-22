import { memo, useEffect, useRef } from 'react';

import { useDpr } from '@/hooks/use-dpr';
import { useIsDark } from '@/hooks/use-theme';
import { getAuraColorStyle, getAuraGlowClass } from '@/lib/aura';
import {
	type AvatarRenderState,
	drawFrame,
	initAvatarRender,
	LOGICAL_SIZE,
	startAnimationLoop,
	stopAnimationLoop,
	THUMBNAIL_GRID_STEP,
} from '@/lib/avatar-renderer';
import { cn } from '@/lib/utils';
import type { AuraData, AvatarWearableData } from '@/types/api';

/** Below this size, skip grid background and animation loops to reduce main-thread work */
const SMALL_SIZE_THRESHOLD = 32;

interface AvatarThumbnailProps {
	sex: string;
	skinTone: number;
	wearables: AvatarWearableData[];
	aura?: AuraData;
	size?: number;
	className?: string;
	showBackground?: boolean;
}

export const AvatarThumbnail = memo(
	function AvatarThumbnail({
		sex,
		skinTone,
		wearables,
		aura,
		size = 32,
		className,
		showBackground = true,
	}: AvatarThumbnailProps) {
		const canvasRef = useRef<HTMLCanvasElement>(null);
		const stateRef = useRef<AvatarRenderState | null>(null);
		const isDark = useIsDark();
		const dpr = useDpr();

		useEffect(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			let cancelled = false;
			let idleHandle = 0;

			const isSmall = size <= SMALL_SIZE_THRESHOLD;

			const displayScale = (size * 2) / LOGICAL_SIZE;
			const adjustedGridStep = Math.round(THUMBNAIL_GRID_STEP / displayScale);

			const doInit = () => {
				void initAvatarRender(
					canvas,
					sex,
					skinTone,
					wearables,
					isDark,
					showBackground,
					adjustedGridStep,
					dpr,
				).then((state) => {
					if (cancelled || !state) return;
					stateRef.current = state;
					if (isSmall) {
						// Static frame only — animations are imperceptible at this size
						drawFrame(state);
					} else {
						startAnimationLoop(state);
					}
				});
			};

			// Defer small thumbnail init to avoid blocking paint when many mount at once
			if (isSmall && 'requestIdleCallback' in window) {
				idleHandle = window.requestIdleCallback(doInit, { timeout: 300 });
			} else {
				doInit();
			}

			return () => {
				cancelled = true;
				if (idleHandle) window.cancelIdleCallback(idleHandle);
				if (stateRef.current) {
					stopAnimationLoop(stateRef.current);
					stateRef.current = null;
				}
			};
		}, [sex, skinTone, wearables, isDark, showBackground, size, dpr]);

		// Handle DPR changes without full re-init
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

		const glowClass = getAuraGlowClass(aura);
		const colorStyle = getAuraColorStyle(aura);

		return (
			<div
				className={cn('flex-shrink-0 rounded', glowClass, className)}
				style={{ width: size, height: size, ...colorStyle }}
			>
				<div className="overflow-hidden rounded" style={{ width: size, height: size }}>
					<canvas
						ref={canvasRef}
						style={{
							width: size * 2,
							height: size * 2,
							marginLeft: -(size * 0.5),
							marginTop: -(size * 0.35),
						}}
					/>
				</div>
			</div>
		);
	},
	(prev, next) =>
		prev.sex === next.sex &&
		prev.skinTone === next.skinTone &&
		prev.size === next.size &&
		prev.className === next.className &&
		prev.showBackground === next.showBackground &&
		prev.wearables === next.wearables &&
		prev.aura === next.aura,
);
