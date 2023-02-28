import 'canvas-toBlob';
import { saveAs } from 'file-saver';
import 'preact';
import { render } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { JSXInternal } from 'preact/src/jsx';
import pkg from '../../package.json';
import { Capture } from './Capture';
import { Cutout } from './Cutout';
import Gl, { Shader, Texture } from './gl';
import { Range } from './Range';
import { hexToRgb, rgbToLuma, sortNumeric, useCheckbox } from './utils';
const inputCanvas = document.createElement('canvas');
const inputCtx = inputCanvas.getContext('2d') as CanvasRenderingContext2D;
const outputCanvas = document.createElement('canvas');
outputCanvas.width = 0;
outputCanvas.height = 0;
// create shader
const gl = Gl(outputCanvas, {
	alpha: true,
	premultipliedAlpha: false,
});
const shader = new Shader(
	`
attribute vec4 position;
void main() {
	gl_Position = position;
}
`,
	`
precision mediump float;
uniform sampler2D tex0;
uniform vec2 resolution;
uniform float brightness;
uniform float contrast;
uniform float threshold;
uniform vec3 fill;
void main() {
	vec2 coord = gl_FragCoord.xy;
	vec2 uv = coord.xy / resolution.xy;
	vec4 col = texture2D(tex0, uv);
	float v = 1.0 - dot(col.rgb / col.a, vec3(0.299, 0.587, 0.114));
	v -= brightness;
	if (v > 0.0) {
		v = mix(0.0, contrast, v);
	} else {
		v = 0.0;
	}
	v = clamp(v, 0.0, 1.0);
	if (threshold <= 1.0) {
		v = step(threshold, v);
	}
	gl_FragColor = vec4(fill, v);
}
`
);

// create plane
const vertices = new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0]);
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
// cache GL attribute/uniform locations
const glLocations = {
	position: gl.getAttribLocation(shader.program, 'position'),
	tex0: gl.getUniformLocation(shader.program, 'tex0'),
	resolution: gl.getUniformLocation(shader.program, 'resolution'),
	brightness: gl.getUniformLocation(shader.program, 'brightness'),
	contrast: gl.getUniformLocation(shader.program, 'contrast'),
	threshold: gl.getUniformLocation(shader.program, 'threshold'),
	fill: gl.getUniformLocation(shader.program, 'fill'),
};
// misc. GL setup
gl.enableVertexAttribArray(glLocations.position);
shader.useProgram();
gl.vertexAttribPointer(glLocations.position, 2, gl.FLOAT, false, 0, 0);
gl.clearColor(0, 0, 0, 0.0);
gl.uniform1i(glLocations.tex0, 0);
const textureSource = new Texture(new Image(), 0, false);

function renderOutput() {
	gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
}

function save() {
	renderOutput();
	outputCanvas.toBlob(saveAs);
}

function App() {
	const [brightness, setBrightness] = useState(1);
	const [contrast, setContrast] = useState(1);
	const [useThreshold, setUseThreshold] = useState(false);
	const [threshold, setThreshold] = useState(0.5);
	const [srcInput, setSrcInput] = useState('');
	const [fill, setFill] = useState('#000000');
	const [auto, setAuto] = useState(true);
	const refSourceImg = useRef<HTMLImageElement>(null);
	const onChange = useCallback<NonNullable<JSXInternal.DOMAttributes<HTMLInputElement>['onChange']>>(event => {
		if (!event.currentTarget?.files?.[0]) return;
		const reader = new FileReader();
		reader.onload = function () {
			setSrcInput(reader.result?.toString() ?? '');
		};
		reader.readAsDataURL(event.currentTarget.files[0]);
	}, []);

	useEffect(() => {
		if (!auto) return;
		const img = new Image();
		img.onload = () => {
			inputCanvas.width = Math.min(img.naturalWidth, 256);
			inputCanvas.height = Math.min(img.naturalHeight, 256);
			inputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);
			inputCtx.filter = 'grayscale() invert()';
			inputCtx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, inputCanvas.width, inputCanvas.height);
			const d = inputCtx.getImageData(0, 0, inputCanvas.width, inputCanvas.height);
			const values = d.data.filter((v, idx) => idx % 4 === 0 && d.data[idx + 3] !== 0);
			values.sort(sortNumeric);
			const median = values[Math.floor(values.length / 2)] / 255.0;
			const nonstddev = Math.sqrt(values.reduce((sum, i) => sum + (i / 255.0 - median) ** 2, 0) / values.length);
			let brightness = parseFloat((median + nonstddev / 2).toFixed(3));
			let contrast = parseFloat((1 / nonstddev).toFixed(3));
			if (brightness !== brightness || brightness === Infinity || brightness === -Infinity) brightness = 0;
			if (contrast !== contrast || contrast === Infinity || contrast === -Infinity) contrast = 1;
			setBrightness(brightness);
			setContrast(contrast);
		};
		img.src = srcInput;
	}, [srcInput, auto]);

	useEffect(() => {
		gl.uniform1f(glLocations.brightness, brightness);
		renderOutput();
	}, [brightness]);
	useEffect(() => {
		gl.uniform1f(glLocations.contrast, contrast);
		renderOutput();
	}, [contrast]);
	useEffect(() => {
		gl.uniform1f(glLocations.threshold, useThreshold ? threshold : Infinity);
		renderOutput();
	}, [threshold, useThreshold]);
	useEffect(() => {
		const rgb = hexToRgb(fill);
		gl.uniform3f(glLocations.fill, rgb[0], rgb[1], rgb[2]);
		renderOutput();
	}, [fill]);
	useEffect(() => {
		const img = new Image();
		img.onerror = img.onload = () => {
			outputCanvas.width = img.naturalWidth;
			outputCanvas.height = img.naturalHeight;
			gl.viewport(0, 0, outputCanvas.width, outputCanvas.height);
			gl.uniform2f(glLocations.resolution, outputCanvas.width, outputCanvas.height);
			// update textures
			textureSource.source = img;
			textureSource.update();
			textureSource.bind();
			renderOutput();
		};
		img.src = srcInput;
	}, [srcInput]);
	useEffect(() => {
		document.querySelector('#output-img')?.appendChild(outputCanvas);
	}, []);

	const clear = useCallback(() => {
		setSrcInput('');
		renderOutput();
		(document.querySelector('#source-file') as HTMLInputElement).value = '';
	}, []);

	const [capturing, setCapturing] = useState(false);
	const beginCapture = useCallback(() => setCapturing(true), []);
	const onCapture = useCallback((src: string) => {
		if (src) setSrcInput(src);
		setCapturing(false);
	}, []);

	const [cutting, setCutting] = useState(false);
	const beginCutout = useCallback(() => setCutting(true), []);
	const onCutout = useCallback((src: string) => {
		if (src) setSrcInput(src);
		setCutting(false);
	}, []);

	const onToggleAuto = useCheckbox(setAuto);
	const onToggleThreshold = useCheckbox(setUseThreshold);
	const onChangeFill = useCallback((event: JSXInternal.TargetedEvent<HTMLInputElement, Event>) => {
		setFill(event.currentTarget.value);
	}, []);
	const toggleTheme = useCallback(() => {
		const theme = document.documentElement.dataset.theme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
		document.documentElement.dataset.theme = theme === 'dark' ? 'light' : 'dark';
	}, []);
	return (
		<>
			<main>
				<h1>sketch-to-lineart</h1>
				<label htmlFor="source-file">source:</label>
				<ul>
					<li>
						<input id="source-file" type="file" accept="image/*" onChange={onChange} />
					</li>
					<li>
						<button type="button" onClick={beginCapture}>
							Take photo
						</button>
					</li>
				</ul>

				<hr />

				<label htmlFor="auto" title="Automatically set brightness/contrast">
					auto:
				</label>
				<input id="auto" title="Automatically set brightness/contrast" type="checkbox" checked={auto} onChange={onToggleAuto} />
				{!auto && (
					<>
						<label htmlFor="brightness">brightness:</label>
						<Range id="brightness" min={0} max={5} step={0.001} value={brightness} setValue={setBrightness} />
						<label htmlFor="contrast">contrast:</label>
						<Range id="contrast" min={1} max={10} step={0.001} value={contrast} setValue={setContrast} />
					</>
				)}

				<hr />

				<label htmlFor="use-threshold" title="Output is fully opaque/fully transparent, with no partially transparent pixels">
					use&nbsp;threshold:
				</label>
				<input id="use-threshold" title="Output is fully opaque/fully transparent, with no partially transparent pixels" type="checkbox" checked={useThreshold} onChange={onToggleThreshold} />
				{useThreshold && (
					<>
						<label htmlFor="threshold">threshold:</label>
						<Range id="threshold" min={0} max={1} step={0.001} value={threshold} setValue={setThreshold} />
					</>
				)}

				<hr />

				<label htmlFor="fill">fill:</label>
				<input id="fill" type="color" value={fill} onInput={onChangeFill} />

				<hr />

				<figure>
					<figcaption>
						original{' '}
						<div>
							<button disabled={!srcInput} type="button" onClick={beginCutout}>
								cutout
							</button>
							<button disabled={!srcInput} type="button" onClick={clear}>
								clear
							</button>
						</div>
					</figcaption>
					<img alt="Source image" id="source-img" src={srcInput} ref={refSourceImg} />
				</figure>

				<figure>
					<figcaption>
						output{' '}
						<button type="button" onClick={save}>
							save
						</button>
					</figcaption>
					<div id="output-img" className={rgbToLuma.apply(undefined, hexToRgb(fill)) > 0.5 ? 'invert' : ''} />
				</figure>
				{capturing && <Capture onCapture={onCapture} />}
				{cutting && <Cutout srcInput={srcInput} onCutout={onCutout} />}
			</main>
			<footer>
				<button type="button" onClick={toggleTheme}>Toggle theme</button>
				v{pkg.version}
			</footer>
		</>
	);
}

render(<App />, document.body);
