import type { Nivel, Tipo } from '#lib/modelo.ts';
import type { Publicacion, Version } from './archivo.ts';
import { sanitizarContenido } from './html.ts';

const ETIQUETAS: readonly [RegExp, string][] = [
	[/^se cancela|^cancelaci[oó]n/i, 'Cancelación'],
	[/^se declara|^declaraci[oó]n/i, 'Declaración'],
	[/^se (actualiza|mantiene)|^actualizaci[oó]n/i, 'Actualización'],
	[/^se ampl[ií]a|^ampliaci[oó]n/i, 'Ampliación'],
	[/^se (modifica|cambia)|^modificaci[oó]n/i, 'Modificación'],
	[/^se (levanta|finaliza|termina)/i, 'Término'],
	[/^monitoreo/i, 'Monitoreo']
];

function etiqueta(titulo: string): string | null {
	return ETIQUETAS.find(([patron]) => patron.test(titulo))?.[1] ?? null;
}

export interface VersionDetalle {
	numero: number;
	fecha: string;
	titulo: string;
	etiqueta: string | null;
	principal: boolean;
	activa: boolean;
	borrada: boolean;
	nivel: Nivel | null;
	html: string;
}

export interface Detalle {
	tipo: Tipo;
	slug: string;
	urlAccess: string;
	titulo: string;
	categoria: string;
	nivel: Nivel | null;
	regiones: { nombre: string; corto: string; slug: string }[];
	provincias: string[];
	comunas: string[];
	inicio: string;
	fin: string;
	borrada: boolean;
	vigente: boolean;
	cancelada: boolean;
	actual: number;
	versiones: VersionDetalle[];
}

function versionDetalle(v: Version): VersionDetalle {
	return {
		numero: v.numero,
		fecha: v.fecha,
		titulo: v.titulo,
		etiqueta: etiqueta(v.titulo),
		principal: v.principal,
		activa: v.activa,
		borrada: v.borrada,
		nivel: v.nivel,
		html: sanitizarContenido(v.contenido, `v${v.numero}-`)
	};
}

export function crearDetalle(p: Publicacion): Detalle {
	return {
		tipo: p.tipo,
		slug: p.slug,
		urlAccess: p.urlAccess,
		titulo: p.titulo,
		categoria: p.categoria,
		nivel: p.nivel,
		regiones: p.regiones.map(({ nombre, corto, slug }) => ({ nombre, corto, slug })),
		provincias: p.provincias,
		comunas: p.comunas,
		inicio: p.inicio,
		fin: p.fin,
		borrada: p.borrada,
		vigente: p.vigente,
		cancelada: etiqueta(p.titulo) === 'Cancelación',
		actual: p.actual.numero,
		versiones: p.versiones.map(versionDetalle)
	};
}
