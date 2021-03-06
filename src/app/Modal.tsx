import { ComponentChildren } from 'preact';

export function Modal({ children }: { children: ComponentChildren }) {
	return <div className="modal">{children}</div>;
}
