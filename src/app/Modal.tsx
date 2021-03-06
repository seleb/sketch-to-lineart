import dialogPolyfill from 'dialog-polyfill';
import { useEffect, useRef } from 'preact/hooks';
import { JSXInternal } from 'preact/src/jsx';

export function Modal({ children, close, ...props }: JSXInternal.HTMLAttributes<HTMLDialogElement> & { close: () => void }) {
	const ref = useRef<HTMLDialogElement>();
	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		dialogPolyfill.registerDialog(dialog);
		dialog.showModal();
		dialog.addEventListener('close', close);
	}, [close]);
	return (
		<dialog ref={ref} aria-modal {...props}>
			{children}
		</dialog>
	);
}
