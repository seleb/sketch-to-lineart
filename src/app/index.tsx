import 'preact';
import { Fragment, h, render } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { JSXInternal } from 'preact/src/jsx';

function App() {
	const [brightness, setBrightness] = useState(1);
	const [contrast, setContrast] = useState(1);
	const [srcInput, setSrcInput] = useState('');
	const [srcOutput, setSrcOutput] = useState('');
	const [auto, setAuto] = useState(true);
	const refSourceImg = useRef<HTMLImageElement>();
	const onChange = useCallback<NonNullable<JSXInternal.DOMAttributes<HTMLInputElement>['onChange']>>(event => {
		if (!event.currentTarget?.files?.[0]) return;
		const reader = new FileReader();
		reader.onload = function () {
			setSrcInput(reader.result?.toString() ?? '');
		};
		reader.readAsDataURL(event.currentTarget.files[0]);
	}, []);

	useEffect(() => {
		if (!auto || !srcInput) return;
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
			ctx.filter = 'grayscale() invert()';
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
			const r = d.data.filter((_, idx) => idx % 4 === 0);
			// normalize + downsample for perf
			const values = new Array(Math.min(r.length, 1000)).fill(0).map((_, idx, a) => r[Math.floor((idx / a.length) * r.length)] / 255.0);
			values.sort();
			const median = values[Math.floor(values.length / 2)];
			const stddev = Math.sqrt(values.reduce((sum, i) => sum + (i - median) ** 2, 0) / values.length);
			setBrightness(parseFloat((median + stddev / 2).toFixed(3)));
			setContrast(parseFloat((1 / stddev).toFixed(3)));
		};
		img.src = srcInput;
	}, [srcInput, auto]);

	useEffect(() => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			if (!canvas || !img || !srcInput) return;
			const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
			ctx.filter = 'grayscale() invert()';
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
			for (let y = 0; y < canvas.height; ++y) {
				for (let x = 0; x < canvas.width; ++x) {
					const idx = (y * canvas.width + x) * 4;
					// set alpha to inverse of grayscale, taking brightness/contrast into account
					let v = d.data[idx] / 255.0;
					v -= brightness; // center on black
					if (v > 0) {
						v = lerp(0, contrast, v);
					} else {
						v = 0;
					}
					d.data[idx + 3] = v * 255.0;
					// set rgb to black
					d.data[idx] = d.data[idx + 1] = d.data[idx + 2] = 0;
				}
			}
			ctx.putImageData(d, 0, 0);
			setSrcOutput(canvas.toDataURL());
		};
		img.src = srcInput;
	}, [srcInput, brightness, contrast]);
	return (
		<Fragment>
			<header>
				<h1>sketch-to-lineart</h1>
			</header>
			<main>
				<label htmlFor="source-file">source:</label>
				<input id="source-file" type="file" accept="image/*" onChange={onChange} />

				<label htmlFor="auto">auto:</label>
				<input
					id="auto"
					type="checkbox"
					checked={auto}
					onChange={event => {
						setAuto(event.currentTarget.checked);
					}}
				/>

				<label htmlFor="brightness">brightness:</label>
				<input
					disabled={auto}
					id="brightness"
					type="range"
					min={0}
					max={5}
					step={0.001}
					value={brightness}
					data-value={brightness}
					onChange={event => {
						setBrightness(parseFloat(event.currentTarget.value));
					}}
				/>
				<label htmlFor="contrast">contrast:</label>
				<input
					disabled={auto}
					id="contrast"
					type="range"
					min={1}
					max={10}
					step={0.001}
					value={contrast}
					data-value={contrast}
					onChange={event => {
						setContrast(parseFloat(event.currentTarget.value));
					}}
				/>

				<figure>
					<figcaption>original</figcaption>
					<img id="source-img" src={srcInput} ref={refSourceImg} />
				</figure>

				<figure>
					<figcaption>
						<a download="lineart.png" href={srcOutput}>
							output
						</a>
					</figcaption>
					<img id="output-img" src={srcOutput} />
				</figure>
			</main>
		</Fragment>
	);
}

function lerp(from: number, to: number, by: number) {
	return from + (to - from) * by;
}

render(<App />, document.body);
