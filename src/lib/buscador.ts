import MiniSearch, { type SearchResult } from 'minisearch';
import type { Filtros, Orden } from './filtros.ts';
import type { FilaIndice, IndiceArchivo, Nivel, TextoArchivo, Tipo } from './modelo.ts';
import { normalizar, terminos } from './texto.ts';

const VACIAS = new Set([
	'a', 'al', 'con', 'de', 'del', 'el', 'en', 'la', 'las', 'lo', 'los', 'para', 'por', 'se', 'su', 'un', 'una', 'y', 'o', 'e'
]);

function procesarTermino(termino: string): string | null {
	const t = normalizar(termino);
	return VACIAS.has(t) ? null : t;
}

export interface Fila {
	i: number;
	pub: FilaIndice;
	categoria: string;
	regiones: string[];
	mes: string;
	lugares: string;
	/** Folded title, places and category, for matching before the text index arrives. */
	doblado: string;
}

export interface Facetas {
	tipo: Record<Tipo, number>;
	categorias: Map<string, number>;
	regiones: Map<string, number>;
	niveles: Record<Nivel, number>;
	meses: Map<string, number>;
	borradas: number;
}

export interface Resultado {
	filas: Fila[];
	facetas: Facetas;
	orden: Orden;
	/** Folded index terms that matched, per row, for highlighting. */
	terminos: Map<number, string[]>;
	textoCompleto: boolean;
}

type Dimension = 'tipo' | 'categoria' | 'region' | 'nivel' | 'fecha' | 'borradas';

interface Documento {
	id: number;
	titulo: string;
	lugares: string;
	texto: string;
}

export class Buscador {
	readonly indice: IndiceArchivo;
	readonly filas: Fila[];
	#texto: MiniSearch<Documento> | null = null;
	#textos: string[] = [];

	constructor(indice: IndiceArchivo) {
		this.indice = indice;
		this.filas = indice.publicaciones.map((pub, i) => {
			const categoria = indice.categorias[pub.categoria];
			const regiones = pub.regiones.flatMap((r) => indice.regiones[r] ?? []);
			const lugares = [pub.comunas, categoria?.nombre ?? '', ...regiones.map((r) => r.corto)].join(' ');
			return {
				i,
				pub,
				categoria: categoria?.slug ?? '',
				regiones: regiones.map((r) => r.slug),
				mes: pub.dia.slice(0, 7),
				lugares,
				doblado: normalizar(`${pub.titulo} ${lugares}`)
			};
		});
	}

	get textoCompleto(): boolean {
		return this.#texto !== null;
	}

	texto(i: number): string {
		return this.#textos[i] ?? '';
	}

	/** Builds the full-text index in small chunks so the page stays responsive. */
	async cargarTexto(texto: TextoArchivo): Promise<void> {
		if (texto.generado !== this.indice.generado) return;
		const ms = new MiniSearch<Documento>({
			fields: ['titulo', 'lugares', 'texto'],
			processTerm: procesarTermino,
			searchOptions: {
				boost: { titulo: 3, lugares: 2 },
				prefix: (t) => t.length >= 3,
				fuzzy: (t) => (t.length >= 5 ? 0.2 : false),
				combineWith: 'AND'
			}
		});
		await ms.addAllAsync(
			this.filas.map((f) => ({
				id: f.i,
				titulo: f.pub.titulo,
				lugares: f.lugares,
				texto: texto.textos[f.i] ?? ''
			})),
			{ chunkSize: 200 }
		);
		this.#textos = texto.textos;
		this.#texto = ms;
	}

	#coincidencias(q: string): Map<number, SearchResult> | 'todas' {
		const consulta = terminos(q).filter((t) => !VACIAS.has(t));
		if (consulta.length === 0) return 'todas';
		const mapa = new Map<number, SearchResult>();
		if (this.#texto) {
			for (const r of this.#texto.search(q)) if (typeof r.id === 'number') mapa.set(r.id, r);
			return mapa;
		}
		for (const f of this.filas) {
			if (consulta.every((t) => f.doblado.includes(t))) {
				mapa.set(f.i, { id: f.i, score: 0, terms: consulta, queryTerms: consulta, match: {} });
			}
		}
		return mapa;
	}

	buscar(f: Filtros): Resultado {
		const coincidencias = this.#coincidencias(f.q);
		const categorias = new Set(f.categorias);
		const regiones = new Set(f.regiones);
		const niveles = new Set(f.niveles);

		const facetas: Facetas = {
			tipo: { evento: 0, alerta: 0 },
			categorias: new Map(),
			regiones: new Map(),
			niveles: { preventiva: 0, amarilla: 0, roja: 0 },
			meses: new Map(),
			borradas: 0
		};
		const contar = (fila: Fila, d: Dimension) => {
			switch (d) {
				case 'tipo':
					facetas.tipo[fila.pub.tipo]++;
					break;
				case 'categoria':
					facetas.categorias.set(fila.categoria, (facetas.categorias.get(fila.categoria) ?? 0) + 1);
					break;
				case 'region':
					for (const r of fila.regiones) facetas.regiones.set(r, (facetas.regiones.get(r) ?? 0) + 1);
					break;
				case 'nivel':
					if (fila.pub.nivel) facetas.niveles[fila.pub.nivel]++;
					break;
				case 'fecha':
					facetas.meses.set(fila.mes, (facetas.meses.get(fila.mes) ?? 0) + 1);
					break;
				case 'borradas':
					if (fila.pub.borrada) facetas.borradas++;
					break;
				default: {
					const _exhaustivo: never = d;
					return _exhaustivo;
				}
			}
		};
		const dimensiones: Dimension[] = ['tipo', 'categoria', 'region', 'nivel', 'fecha', 'borradas'];

		const filas: Fila[] = [];
		for (const fila of this.filas) {
			if (coincidencias !== 'todas' && !coincidencias.has(fila.i)) continue;
			const { pub } = fila;
			const falla: Record<Dimension, boolean> = {
				tipo: f.tipo !== null && pub.tipo !== f.tipo,
				categoria: categorias.size > 0 && !categorias.has(fila.categoria),
				region: regiones.size > 0 && !fila.regiones.some((r) => regiones.has(r)),
				nivel: niveles.size > 0 && (pub.nivel === null || !niveles.has(pub.nivel)),
				fecha: (f.desde !== null && pub.dia < f.desde) || (f.hasta !== null && pub.dia > f.hasta),
				borradas: !f.borradas && pub.borrada
			};
			const fallidas = dimensiones.filter((d) => falla[d]);
			if (fallidas.length === 0) {
				filas.push(fila);
				for (const d of dimensiones) contar(fila, d);
			} else if (fallidas.length === 1 && fallidas[0]) {
				contar(fila, fallidas[0]);
			}
		}

		const conConsulta = coincidencias !== 'todas';
		const orden: Orden = f.orden === 'relevancia' && !conConsulta ? 'recientes' : (f.orden ?? 'recientes');
		const puntaje = (fila: Fila) => (conConsulta ? (coincidencias.get(fila.i)?.score ?? 0) : 0);
		if (orden === 'antiguas') filas.reverse();
		else if (orden === 'relevancia' && conConsulta) filas.sort((a, b) => puntaje(b) - puntaje(a));

		const terminosPorFila = new Map<number, string[]>();
		if (conConsulta) for (const [i, r] of coincidencias) terminosPorFila.set(i, r.terms);

		return { filas, facetas, orden, terminos: terminosPorFila, textoCompleto: this.textoCompleto };
	}
}
