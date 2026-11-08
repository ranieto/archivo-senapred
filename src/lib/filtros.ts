import { esNivel, esTipo, type Nivel, type Tipo } from './modelo.ts';

export type Orden = 'recientes' | 'antiguas' | 'relevancia';

export interface Filtros {
	q: string;
	tipo: Tipo | null;
	/** Category slugs. */
	categorias: string[];
	/** Region slugs. */
	regiones: string[];
	niveles: Nivel[];
	/** Inclusive Chilean calendar days, `YYYY-MM-DD`. */
	desde: string | null;
	hasta: string | null;
	borradas: boolean;
	/** `null` means the default: relevance with a query, newest first without one. */
	orden: Orden | null;
}

export const FILTROS_VACIOS: Filtros = {
	q: '',
	tipo: null,
	categorias: [],
	regiones: [],
	niveles: [],
	desde: null,
	hasta: null,
	borradas: false,
	orden: null
};

const DIA = /^\d{4}-\d{2}-\d{2}$/;

function esOrden(valor: string): valor is Orden {
	return valor === 'recientes' || valor === 'antiguas' || valor === 'relevancia';
}

function listaParam(params: Pick<URLSearchParams, 'get'>, clave: string): string[] {
	return [...new Set((params.get(clave) ?? '').split(',').filter(Boolean))];
}

function dia(valor: string | null): string | null {
	return valor !== null && DIA.test(valor) ? valor : null;
}

/** URL query string → filters. Unknown or malformed values are dropped, never fatal. */
export function leerFiltros(params: Pick<URLSearchParams, 'get'>): Filtros {
	const tipo = params.get('tipo') ?? '';
	const orden = params.get('orden') ?? '';
	return {
		q: params.get('q') ?? '',
		tipo: esTipo(tipo) ? tipo : null,
		categorias: listaParam(params, 'categoria'),
		regiones: listaParam(params, 'region'),
		niveles: listaParam(params, 'nivel').filter(esNivel),
		desde: dia(params.get('desde')),
		hasta: dia(params.get('hasta')),
		borradas: params.get('borradas') === '1',
		orden: esOrden(orden) ? orden : null
	};
}

/** Filters → query string (without `?`), omitting defaults so links stay short. */
export function escribirFiltros(f: Filtros): string {
	const params = new URLSearchParams();
	if (f.q.trim()) params.set('q', f.q);
	if (f.tipo) params.set('tipo', f.tipo);
	if (f.categorias.length) params.set('categoria', f.categorias.join(','));
	if (f.regiones.length) params.set('region', f.regiones.join(','));
	if (f.niveles.length) params.set('nivel', f.niveles.join(','));
	if (f.desde) params.set('desde', f.desde);
	if (f.hasta) params.set('hasta', f.hasta);
	if (f.borradas) params.set('borradas', '1');
	if (f.orden) params.set('orden', f.orden);
	return params.toString().replaceAll('%2C', ',');
}

export function alternar<T>(lista: readonly T[], valor: T): T[] {
	return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

export function cantidadFiltros(f: Filtros): number {
	return (
		(f.tipo ? 1 : 0) +
		f.categorias.length +
		f.regiones.length +
		f.niveles.length +
		(f.desde || f.hasta ? 1 : 0) +
		(f.borradas ? 1 : 0)
	);
}
