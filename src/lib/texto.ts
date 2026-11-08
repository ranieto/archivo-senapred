const MARCAS = /\p{Diacritic}/gu;

/** Lowercase and strip diacritics, so "Ñuble" and "nuble" or "hidrometeorológico" and "hidrometeorologico" compare equal. */
export function normalizar(texto: string): string {
	return texto.normalize('NFD').replace(MARCAS, '').toLowerCase();
}

export function slugificar(texto: string): string {
	return normalizar(texto)
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export function terminos(consulta: string): string[] {
	return normalizar(consulta)
		.split(/[^\p{L}\p{N}]+/u)
		.filter((t) => t.length > 0);
}
