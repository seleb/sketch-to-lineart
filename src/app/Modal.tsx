import { useEffect } from 'preact/hooks';
import { JSXInternal } from 'preact/src/jsx';

export function Modal({ children, close, ...props }: JSXInternal.HTMLAttributes<HTMLDivElement> & { close: () => void }) {
	// close modal on Escape
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				close();
			}
		}
		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [close]);
	return (
		<div role="dialog" aria-modal className="modal" {...props}>
			{children}
		</div>
	);
}
