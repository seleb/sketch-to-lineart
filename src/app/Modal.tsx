import { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';

export function Modal({ children, close }: { children: ComponentChildren; close: () => void }) {
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
	return <div className="modal">{children}</div>;
}
