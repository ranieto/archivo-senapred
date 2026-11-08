import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Nivel, Tipo } from '#lib/modelo.ts';
import { slugificar } from '#lib/texto.ts';
import { REGIONES_NORTE_A_SUR } from './regiones.ts';

export interface Region {
	codigo: string;
	nombre: string;
	corto: string;
	slug: string;
	/** Position from north to south. */
	orden: number;
}

export interface Version {
	id: string;
	/** 1-based, chronological by creation. */
	numero: number;
	/** When SENAPRED says it happened; for deleted records, when the record was created. */
	fecha: string;
	creado: string;
	modificado: string;
	principal: boolean;
	activa: boolean;
	borrada: boolean;
	titulo: string;
	categoria: string;
	nivel: Nivel | null;
	regiones: Region[];
	provincias: string[];
	comunas: string[];
	/** Third-party HTML as published. Sanitize before rendering. */
	contenido: string;
}

export interface Publicacion {
	tipo: Tipo;
	/** This archive's URL segment; equals `urlAccess` unless that is too long for a file name. */
	slug: string;
	/** The official site's slug. */
	urlAccess: string;
	titulo: string;
	categoria: string;
	nivel: Nivel | null;
	regiones: Region[];
	provincias: string[];
	comunas: string[];
	inicio: string;
	fin: string;
	versiones: Version[];
	actual: Version;
	/** Every version is deleted on the official site. */
	borrada: boolean;
	conBorrados: boolean;
	/** Still active on the official site. */
	vigente: boolean;
}

export interface Catalogos {
	regiones: Map<string, Region>;
	categorias: Map<string, string>;
	niveles: Map<string, Nivel>;
}

/** A raw record after parsing. */
interface Registro {
	id: string;
	tipo: Tipo;
	titulo: string;
	fechaHora: string;
	creado: string;
	modificado: string;
	slug: string;
	principal: boolean;
	activo: boolean;
	borrado: boolean;
	regionesIds: string[];
	provincias: string;
	comunas: string;
	categoriaId: string;
	tipoAlertaId: string | null;
	contenido: string;
}

const NIVEL_POR_CODIGO: Record<string, Nivel> = { v: 'preventiva', a: 'amarilla', r: 'roja' };

const FECHA_BORRADA = '2000-01-01';

class RegistroInvalido extends Error {}

function objeto(valor: unknown, donde: string): Record<string, unknown> {
	if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
		throw new RegistroInvalido(`${donde}: se esperaba un objeto`);
	}
	return valor as Record<string, unknown>;
}

function texto(o: Record<string, unknown>, clave: string, donde: string): string {
	const valor = o[clave];
	if (typeof valor !== 'string') throw new RegistroInvalido(`${donde}: "${clave}" no es texto`);
	return valor;
}

function booleano(o: Record<string, unknown>, clave: string, donde: string): boolean {
	const valor = o[clave];
	if (typeof valor !== 'boolean') throw new RegistroInvalido(`${donde}: "${clave}" no es booleano`);
	return valor;
}

function textoOpcional(o: Record<string, unknown>, clave: string): string {
	const valor = o[clave];
	return typeof valor === 'string' ? valor : '';
}

export function parsearRegistro(crudo: unknown, tipo: Tipo, donde = 'registro'): Registro {
	const o = objeto(crudo, donde);
	const ids = o.regionesIds;
	const meta = objeto(JSON.parse(texto(o, 'metaData', donde)), `${donde} metaData`);
	return {
		id: texto(o, 'id', donde),
		tipo,
		titulo: texto(o, 'titulo', donde).trim(),
		fechaHora: texto(o, 'fechaHora', donde),
		creado: texto(o, 'createdAt', donde),
		modificado: texto(o, 'updatedAt', donde),
		slug: texto(o, 'urlAccess', donde),
		principal: booleano(o, 'isPrincipal', donde),
		activo: booleano(o, 'isActive', donde),
		borrado: booleano(o, 'isDeleted', donde),
		regionesIds: Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [],
		provincias: textoOpcional(meta, 'provincias'),
		comunas: textoOpcional(meta, 'comunas'),
		categoriaId: texto(o, tipo === 'evento' ? 'variableInformateEventosId' : 'variableRiesgoAlertasId', donde),
		tipoAlertaId: tipo === 'alerta' ? texto(o, 'tipoAlertaId', donde) : null,
		contenido: textoOpcional(o, 'contenido')
	};
}

const UN_ANIO = 365 * 24 * 60 * 60 * 1000;

/**
 * `fechaHora` comes with fractions such as `.1818`; deletion overwrites it with 2000-01-01, and a
 * mistyped year (2020 for 2026) can put it years before the record existed. In those cases the
 * record's creation is the best date available.
 */
export function resolverFecha(r: Pick<Registro, 'fechaHora' | 'creado' | 'borrado'>): string {
	if (r.borrado || r.fechaHora.startsWith(FECHA_BORRADA)) return r.creado;
	const ms = Date.parse(r.fechaHora.replace(/(\.\d{3})\d+/, '$1'));
	return Number.isNaN(ms) || ms < Date.parse(r.creado) - UN_ANIO ? r.creado : new Date(ms).toISOString();
}

const LARGO_MAXIMO = 120;

/** Some official slugs exceed file-name limits once prerendered, so long ones are cut and suffixed with a hash. */
export function slugArchivo(urlAccess: string): string {
	if (urlAccess.length <= LARGO_MAXIMO) return urlAccess;
	const corte = urlAccess.slice(0, LARGO_MAXIMO - 9);
	const base = corte.slice(0, corte.lastIndexOf('-') > 0 ? corte.lastIndexOf('-') : corte.length);
	return `${base}-${createHash('sha1').update(urlAccess).digest('hex').slice(0, 8)}`;
}

function lista(valor: string): string[] {
	return valor
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

function union<T>(listas: T[][], clave: (t: T) => string = String): T[] {
	const vistos = new Map<string, T>();
	for (const l of listas) for (const t of l) if (!vistos.has(clave(t))) vistos.set(clave(t), t);
	return [...vistos.values()];
}

function capitalizar(s: string): string {
	return s.charAt(0).toLocaleUpperCase('es-CL') + s.slice(1);
}

function crearVersion(r: Registro, numero: number, catalogos: Catalogos): Version {
	return {
		id: r.id,
		numero,
		fecha: resolverFecha(r),
		creado: r.creado,
		modificado: r.modificado,
		principal: r.principal,
		activa: r.activo,
		borrada: r.borrado,
		titulo: r.titulo,
		categoria: capitalizar(catalogos.categorias.get(r.categoriaId) ?? 'Otros'),
		nivel: r.tipoAlertaId === null ? null : (catalogos.niveles.get(r.tipoAlertaId) ?? null),
		regiones: r.regionesIds
			.map((id) => catalogos.regiones.get(id))
			.filter((region) => region !== undefined)
			.sort((a, b) => a.orden - b.orden),
		provincias: lista(r.provincias),
		comunas: lista(r.comunas),
		contenido: r.contenido
	};
}

/** The version the official site shows: the principal one, else the latest still published, else the latest. */
function elegirActual(versiones: Version[]): Version {
	const vivas = versiones.filter((v) => !v.borrada);
	const ultima = versiones.at(-1);
	if (ultima === undefined) throw new Error('publicación sin versiones');
	return vivas.find((v) => v.principal) ?? vivas.at(-1) ?? ultima;
}

/** A publication is every record sharing `urlAccess` within one type. */
export function agruparPublicaciones(
	registros: readonly Registro[],
	catalogos: Catalogos
): Publicacion[] {
	const grupos = new Map<string, Registro[]>();
	for (const r of registros) {
		const clave = `${r.tipo}/${r.slug}`;
		const grupo = grupos.get(clave);
		if (grupo) grupo.push(r);
		else grupos.set(clave, [r]);
	}

	const publicaciones: Publicacion[] = [];
	for (const grupo of grupos.values()) {
		grupo.sort((a, b) => a.creado.localeCompare(b.creado) || a.id.localeCompare(b.id));
		const versiones = grupo.map((r, i) => crearVersion(r, i + 1, catalogos));
		const actual = elegirActual(versiones);
		const borrada = versiones.every((v) => v.borrada);
		const fuente = borrada ? versiones : versiones.filter((v) => !v.borrada);
		const fechas = versiones.map((v) => v.fecha).sort();
		const primera = grupo[0];
		if (primera === undefined) continue;
		publicaciones.push({
			tipo: primera.tipo,
			slug: slugArchivo(primera.slug),
			urlAccess: primera.slug,
			titulo: actual.titulo,
			categoria: actual.categoria,
			nivel: actual.nivel,
			regiones: union(
				fuente.map((v) => v.regiones),
				(r) => r.codigo
			).sort((a, b) => a.orden - b.orden),
			provincias: union(fuente.map((v) => v.provincias)),
			comunas: union(fuente.map((v) => v.comunas)),
			inicio: fechas[0] ?? actual.fecha,
			fin: fechas.at(-1) ?? actual.fecha,
			versiones,
			actual,
			borrada,
			conBorrados: !borrada && versiones.some((v) => v.borrada),
			vigente: !borrada && actual.activa
		});
	}
	return publicaciones.sort((a, b) => b.inicio.localeCompare(a.inicio));
}

export function crearCatalogos(crudos: {
	regiones: unknown;
	variablesInformate: unknown;
	variablesRiesgo: unknown;
	tiposAlerta: unknown;
}): Catalogos {
	const filas = (valor: unknown, donde: string) => {
		if (!Array.isArray(valor)) throw new RegistroInvalido(`${donde}: se esperaba una lista`);
		return valor.map((v, i) => objeto(v, `${donde}[${i}]`));
	};
	const orden = new Map(REGIONES_NORTE_A_SUR.map((r, i) => [r.codigo, { ...r, orden: i }]));
	const regiones = new Map<string, Region>();
	for (const r of filas(crudos.regiones, 'regiones')) {
		const codigo = texto(r, 'codigo', 'región');
		const nombre = texto(r, 'nombre', 'región');
		const conocida = orden.get(codigo);
		const corto = conocida?.corto ?? nombre.replace(/^Región (de la |del |de )?/, '');
		regiones.set(texto(r, 'id', 'región'), {
			codigo,
			nombre,
			corto,
			slug: slugificar(corto),
			orden: conocida?.orden ?? orden.size
		});
	}
	const categorias = new Map<string, string>();
	for (const v of [
		...filas(crudos.variablesInformate, 'variables-informate'),
		...filas(crudos.variablesRiesgo, 'variables-riesgo')
	]) {
		categorias.set(texto(v, 'id', 'variable'), texto(v, 'nombre', 'variable').trim());
	}
	const niveles = new Map<string, Nivel>();
	for (const t of filas(crudos.tiposAlerta, 'tipos-alerta')) {
		const nivel = NIVEL_POR_CODIGO[texto(t, 'codigo', 'tipo de alerta')];
		if (nivel) niveles.set(texto(t, 'id', 'tipo de alerta'), nivel);
	}
	return { regiones, categorias, niveles };
}

export interface Archivo {
	publicaciones: Publicacion[];
	regiones: Region[];
	categorias: string[];
	/** Date of the last data collection. */
	recolectado: string;
	/** Build stamp shared by the two search indexes. */
	generado: string;
	buscar(tipo: Tipo, slug: string): Publicacion | undefined;
}

function archivosJson(dir: string): string[] {
	return readdirSync(dir, { recursive: true, encoding: 'utf8' })
		.filter((f) => f.endsWith('.json'))
		.map((f) => join(dir, f));
}

function leerJson(ruta: string): unknown {
	return JSON.parse(readFileSync(ruta, 'utf8'));
}

function fechaRecoleccion(raiz: string, publicaciones: Publicacion[]): string {
	try {
		const fecha = execFileSync('git', ['log', '-1', '--format=%cI', '--', 'data'], {
			cwd: raiz,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		}).trim();
		if (fecha) return new Date(fecha).toISOString();
	} catch {
		// Not a git checkout: fall back to the newest record.
	}
	return publicaciones.flatMap((p) => p.versiones.map((v) => v.modificado)).sort().at(-1) ?? new Date(0).toISOString();
}

export function leerArchivo(raiz: string): Archivo {
	const datos = join(raiz, 'data');
	const catalogo = (nombre: string) => leerJson(join(datos, 'catalogos', `${nombre}.json`));
	const catalogos = crearCatalogos({
		regiones: catalogo('regiones'),
		variablesInformate: catalogo('variables-informate'),
		variablesRiesgo: catalogo('variables-riesgo'),
		tiposAlerta: catalogo('tipos-alerta')
	});

	const registros: Registro[] = [];
	for (const [tipo, carpeta] of [
		['evento', 'eventos'],
		['alerta', 'alertas']
	] as const) {
		for (const ruta of archivosJson(join(datos, carpeta))) {
			registros.push(parsearRegistro(leerJson(ruta), tipo, ruta));
		}
	}

	const publicaciones = agruparPublicaciones(registros, catalogos);
	const porClave = new Map(publicaciones.map((p) => [`${p.tipo}/${p.slug}`, p]));
	if (porClave.size !== publicaciones.length) throw new Error('dos publicaciones comparten la misma dirección en el archivo');
	const regiones = [...catalogos.regiones.values()].sort((a, b) => a.orden - b.orden);
	const categorias = [...new Set(publicaciones.map((p) => p.categoria))].sort((a, b) => a.localeCompare(b, 'es'));

	return {
		publicaciones,
		regiones,
		categorias,
		recolectado: fechaRecoleccion(raiz, publicaciones),
		generado: new Date().toISOString(),
		buscar: (tipo, slug) => porClave.get(`${tipo}/${slug}`)
	};
}

let cache: Archivo | undefined;

/** The archive read from `data/`, once per process. */
export function cargarArchivo(): Archivo {
	cache ??= leerArchivo(resolve('.'));
	return cache;
}
