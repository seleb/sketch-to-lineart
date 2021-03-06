import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Modal } from './Modal';
import { sortNumeric } from './utils';

export function Cutout({ srcInput, onCutout }: { srcInput: string; onCutout: (src: string) => void }) {
	const [src, setSrc] = useState(srcInput);
	const refCanvas = useRef<HTMLCanvasElement>();
	const refContext = useRef<CanvasRenderingContext2D>();
	const ref = useRef<HTMLCanvasElement>();
	useEffect(() => {
		const img = new Image();
		img.onload = () => {
			const canvas = refCanvas.current;
			if (!refContext.current) {
				const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
				refContext.current = ctx;
			}
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			refContext.current.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
		};
		img.src = srcInput;
	}, [srcInput]);
	useEffect(() => {
		const canvas = refCanvas.current;
		if (!canvas) return;
		let points: [number, number][] = [];
		function getPos(event: PointerEvent): [number, number] {
			const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();

			const x = ((event.clientX - bounds.left) / bounds.width) * canvas.width;
			const y = ((event.clientY - bounds.top) / bounds.height) * canvas.height;
			return [x, y];
		}
		function start(event: PointerEvent) {
			points.push(getPos(event));
			canvas.addEventListener('pointermove', move);
			event.preventDefault();
		}
		function end(event: PointerEvent) {
			canvas.removeEventListener('pointermove', move);
			event.preventDefault();

			const img = new Image();
			img.onload = () => {
				const sortedX = points.map(([x, y]) => x).sort(sortNumeric);
				const sortedY = points.map(([x, y]) => y).sort(sortNumeric);
				const minX = sortedX[0];
				const minY = sortedY[0];
				const maxX = sortedX[sortedX.length - 1];
				const maxY = sortedY[sortedY.length - 1];
				refCanvas.current.width = maxX - minX;
				refCanvas.current.height = maxY - minY;
				refContext.current.clearRect(0, 0, refCanvas.current.width, refCanvas.current.height);
				refContext.current.save();
				refContext.current.beginPath();
				refContext.current.moveTo(points[0][0] - minX, points[0][1] - minY);
				points.slice(1).forEach(([x, y]) => {
					refContext.current.lineTo(x - minX, y - minY);
				});
				refContext.current.clip();
				refContext.current.drawImage(img, minX, minY, refCanvas.current.width, refCanvas.current.height, 0, 0, refCanvas.current.width, refCanvas.current.height);
				refContext.current.restore();
				points = [];
				setSrc(refCanvas.current.toDataURL());
			};
			img.src = src;
		}
		function move(event: PointerEvent) {
			const [nextX, nextY] = getPos(event);
			const [prevX, prevY] = points[points.length - 1];
			if (Math.abs(nextX - prevX) + Math.abs(nextY - prevY) < 25) {
				return;
			}
			points.push([nextX, nextY]);
			refContext.current.setLineDash([5, 5]);
			refContext.current.lineWidth = 4;
			refContext.current.strokeStyle = '#000';
			refContext.current.lineTo(event.pageX, event.pageY);
			refContext.current.beginPath();
			refContext.current.moveTo(prevX, prevY);
			refContext.current.lineTo(nextX, nextY);
			refContext.current.stroke();
			refContext.current.lineWidth = 3;
			refContext.current.strokeStyle = '#FFF';
			refContext.current.lineTo(event.pageX, event.pageY);
			refContext.current.beginPath();
			refContext.current.moveTo(prevX, prevY);
			refContext.current.lineTo(nextX, nextY);
			refContext.current.stroke();
			event.preventDefault();
		}
		canvas.addEventListener('pointerdown', start);
		canvas.addEventListener('pointerup', end);
		return () => {
			canvas.removeEventListener('pointerdown', start);
			canvas.removeEventListener('pointerup', end);
			canvas.removeEventListener('pointermove', move);
		};
	}, [ref, src]);
	const save = useCallback(() => {
		onCutout(src);
	}, [src]);
	const cancel = useCallback(() => {
		onCutout(srcInput);
	}, [srcInput]);
	return (
		<Modal>
			<canvas draggable={false} ref={refCanvas} src={srcInput} />
			<nav>
				<button onClick={save}>save</button>
				<button onClick={cancel}>cancel</button>
			</nav>
		</Modal>
	);
}
