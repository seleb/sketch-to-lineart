import { useEffect, useRef } from 'preact/hooks';
import { JSXInternal } from 'preact/src/jsx';

export function Modal({ children, close, ...props }: JSXInternal.HTMLAttributes<HTMLDivElement> & { close: () => void }) {
	const ref = useRef<HTMLDivElement>();
	// close modal on Escape
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape' && (ref.current === document.activeElement || ref.current.contains(document.activeElement))) {
				close();
			}
		}
		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [close]);
	return (
		<div ref={ref} role="dialog" aria-modal className="modal" {...props}>
			{children}
		</div>
	);
}
