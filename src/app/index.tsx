import 'canvas-toBlob';
import { saveAs } from 'file-saver';
import 'preact';
import { Fragment, h, render } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { JSXInternal } from 'preact/src/jsx';
import { Capture } from './Capture';
import { Cutout } from './Cutout';
import Gl, { Shader, Texture } from './gl';
const inputCanvas = document.createElement('canvas');
const inputCtx = inputCanvas.getContext('2d') as CanvasRenderingContext2D;
const outputCanvas = document.createElement('canvas');
outputCanvas.width = 0;
outputCanvas.height = 0;
// create shader
const gl = Gl(outputCanvas);
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
	gl_FragColor = vec4(vec3(0.0), v);
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
};
// misc. GL setup
gl.enableVertexAttribArray(glLocations.position);
shader.useProgram();
gl.vertexAttribPointer(glLocations.position, 2, gl.FLOAT, false, 0, 0);
gl.clearColor(0, 0, 0, 1.0);
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
	const [srcInput, setSrcInput] = useState('');
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
		if (!auto) return;
		const img = new Image();
		img.onload = () => {
			inputCanvas.width = Math.min(img.naturalWidth, 256);
			inputCanvas.height = Math.min(img.naturalHeight, 256);
			inputCtx.clearRect(0, 0, inputCanvas.width, inputCanvas.height);
			inputCtx.filter = 'grayscale() invert()';
			inputCtx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, inputCanvas.width, inputCanvas.height);
			const d = inputCtx.getImageData(0, 0, inputCanvas.width, inputCanvas.height);
			const values = d.data.filter((v, idx) => idx % 4 === 0 && d.data[idx+3] !== 0);
			values.sort();
			const median = values[Math.floor(values.length / 2)] / 255.0;
			const nonstddev = Math.sqrt(values.reduce((sum, i) => sum + (i / 255.0 - median) ** 2, 0) / values.length);
			let brightness = parseFloat((median + nonstddev / 2).toFixed(3));
			let contrast = parseFloat((1 / nonstddev).toFixed(3));
			if (brightness !== brightness) brightness = 0;
			if (contrast !== contrast) contrast = 1;
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
		const img = new Image();
		img.onload = () => {
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
		img.onerror = img.onload;
		img.src = srcInput;
	}, [srcInput]);
	useEffect(() => {
		document.querySelector('#output-img')?.appendChild(outputCanvas);
	}, []);

	const clear = useCallback(() => {
		setSrcInput('');
		renderOutput();
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

	return (
		<Fragment>
			<header>
				<h1>sketch-to-lineart</h1>
			</header>
			<main>
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
					<figcaption>
						original{' '}
						<div>
							<button type="button" onClick={beginCutout}>
								cutout
							</button>
							<button type="button" onClick={clear}>
								clear
							</button>
						</div>
					</figcaption>
					<img id="source-img" src={srcInput} ref={refSourceImg} />
				</figure>

				<figure>
					<figcaption>
						output{' '}
						<button type="button" onClick={save}>
							save
						</button>
					</figcaption>
					<div id="output-img" />
				</figure>
				{capturing && <Capture onCapture={onCapture} />}
				{cutting && <Cutout srcInput={srcInput} onCutout={onCutout} />}
			</main>
		</Fragment>
	);
}

render(<App />, document.body);
