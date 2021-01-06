import { h } from 'preact';
import { useCallback, useRef } from 'preact/hooks';
import Webcam from './Webcam';

const videoConstraints = {
	facingMode: 'environment',
};

export function Capture({ onCapture }: { onCapture: (src: string) => void }) {
	const webcamRef = useRef<Webcam>();
	const capture = useCallback(() => {
		onCapture(webcamRef.current.getScreenshot());
	}, []);
	const cancel = useCallback(() => {
		onCapture('');
	}, []);
	return (
		<div id="capture">
			<Webcam
				mirrored
				audio={false}
				ref={webcamRef}
				screenshotFormat="image/jpeg"
				onUserMediaError={alert}
				videoConstraints={videoConstraints}
			/>
			<nav>
				<button type="button" onClick={capture}>
					Save
				</button>
				<button type="button" onClick={cancel}>
					Cancel
				</button>
			</nav>
		</div>
	);
}
