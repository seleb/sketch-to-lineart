import { useCallback } from 'preact/hooks';
import { JSXInternal } from 'preact/src/jsx';

export function sortNumeric(a: number, b: number) {
	return a - b;
}

export function hexToRgb(hex: string): [number, number, number] {
	const rgb = parseInt(hex.replace('#', '0x'));
	return [((rgb >> 16) & 0xff) / 0xff, ((rgb >> 8) & 0xff) / 0xff, (rgb & 0xff) / 0xff];
}

export function rgbToLuma(r: number, g: number, b: number) {
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function useCheckbox(set: (checked: boolean) => void) {
	return useCallback(
		(event: JSXInternal.TargetedEvent<HTMLInputElement, Event>) => {
			set(event.currentTarget.checked);
		},
		[set]
	);
}

export function useRange(set: (value: number) => void) {
	return useCallback(
		(event: JSXInternal.TargetedEvent<HTMLInputElement, Event>) => {
			set(parseFloat(event.currentTarget.value));
		},
		[set]
	);
}
