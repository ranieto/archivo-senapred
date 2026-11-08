import { normalizar } from './texto.ts';

export interface Tramo {
	texto: string;
	marcado: boolean;
}

/** Folded text plus, for each folded character, the index of the original character it came from. */
function doblar(texto: string): { doblado: string; origen: number[] } {
	let doblado = '';
	const origen: number[] = [];
	let i = 0;
	for (const caracter of texto) {
		const d = normalizar(caracter);
		doblado += d;
		for (let k = 0; k < d.length; k++) origen.push(i);
		i += caracter.length;
	}
	return { doblado, origen };
}

const LETRA = /[\p{L}\p{N}]/u;

/** Marks every word that starts with one of `terminos` (already folded), ignoring accents and case. */
export function resaltar(texto: string, terminos: readonly string[]): Tramo[] {
	if (terminos.length === 0) return [{ texto, marcado: false }];
	const { doblado, origen } = doblar(texto);
	const rangos: [number, number][] = [];
	for (const termino of new Set(terminos)) {
		if (!termino) continue;
		let desde = doblado.indexOf(termino);
		while (desde !== -1) {
			const previo = doblado[desde - 1];
			if (previo === undefined || !LETRA.test(previo)) {
				const fin = desde + termino.length;
				const inicio = origen[desde] ?? 0;
				const final = fin < origen.length ? (origen[fin] ?? texto.length) : texto.length;
				rangos.push([inicio, final]);
			}
			desde = doblado.indexOf(termino, desde + 1);
		}
	}
	if (rangos.length === 0) return [{ texto, marcado: false }];
	rangos.sort((a, b) => a[0] - b[0]);
	const tramos: Tramo[] = [];
	let cursor = 0;
	for (const [inicio, fin] of rangos) {
		if (fin <= cursor) continue;
		const desde = Math.max(inicio, cursor);
		if (desde > cursor) tramos.push({ texto: texto.slice(cursor, desde), marcado: false });
		tramos.push({ texto: texto.slice(desde, fin), marcado: true });
		cursor = fin;
	}
	if (cursor < texto.length) tramos.push({ texto: texto.slice(cursor), marcado: false });
	return tramos;
}

/** A window of `texto` around the first match, or `null` when nothing matches. */
export function fragmento(texto: string, terminos: readonly string[], largo = 220): string | null {
	if (!texto || terminos.length === 0) return null;
	const { doblado, origen } = doblar(texto);
	let primera = -1;
	for (const t of terminos) {
		const i = doblado.search(new RegExp(`(^|[^\\p{L}\\p{N}])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u'));
		if (i !== -1 && (primera === -1 || i < primera)) primera = i;
	}
	if (primera === -1) return null;
	const centro = origen[primera] ?? 0;
	let inicio = Math.max(0, centro - Math.floor(largo / 3));
	let fin = Math.min(texto.length, inicio + largo);
	if (inicio > 0) inicio = texto.indexOf(' ', inicio) + 1 || inicio;
	if (fin < texto.length) fin = texto.lastIndexOf(' ', fin) > inicio ? texto.lastIndexOf(' ', fin) : fin;
	return `${inicio > 0 ? '… ' : ''}${texto.slice(inicio, fin).trim()}${fin < texto.length ? ' …' : ''}`;
}
