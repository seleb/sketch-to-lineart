import inside from 'point-in-polygon';
import { h } from 'preact';
import { useCallback, useEffect, useRef } from 'preact/hooks';

export function Cutout({ srcInput, onCutout }: { srcInput: string; onCutout: (src: string) => void }) {
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
				refContext.current.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
				refContext.current.fillStyle = '#FFF';
				for (let y = 0; y < img.naturalHeight; ++y) {
					for (let x = 0; x < img.naturalWidth; ++x) {
						if (!inside([x, y], points)) {
							refContext.current.fillRect(x, y, 1, 1);
						}
					}
				}
				points = [];
			};
			img.src = srcInput;
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
	}, [ref, srcInput]);
	const save = useCallback(() => {
		onCutout(refCanvas.current.toDataURL());
	}, []);
	const cancel = useCallback(() => {
		onCutout(srcInput);
	}, []);
	return (
		<div id="capture">
			<canvas draggable={false} ref={refCanvas} src={srcInput} />
			<nav>
				<button onClick={save}>save</button>
				<button onClick={cancel}>cancel</button>
			</nav>
		</div>
	);
}
