export function sortNumeric(a: number, b: number) {
	return a - b;
}

export function hexToRgb(hex: string) {
	const rgb = parseInt(hex.replace('#', '0x'));
	return [((rgb >> 16) & 0xff) / 0xff, ((rgb >> 8) & 0xff) / 0xff, (rgb & 0xff) / 0xff];
}
