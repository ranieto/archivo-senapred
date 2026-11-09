import { diaChile } from '#lib/fechas.ts';
import type { IndiceArchivo, TextoArchivo } from '#lib/modelo.ts';
import { slugificar } from '#lib/texto.ts';
import type { Archivo } from './archivo.ts';
import { textoPlano } from './html.ts';

export function crearIndice(archivo: Archivo): IndiceArchivo {
	const categoria = new Map(archivo.categorias.map((c, i) => [c, i]));
	const region = new Map(archivo.regiones.map((r, i) => [r.codigo, i]));
	return {
		generado: archivo.generado,
		recolectado: archivo.recolectado,
		categorias: archivo.categorias.map((nombre) => ({ nombre, slug: slugificar(nombre) })),
		regiones: archivo.regiones.map(({ codigo, nombre, corto, slug }) => ({ codigo, nombre, corto, slug })),
		publicaciones: archivo.publicaciones.map((p) => ({
			tipo: p.tipo,
			slug: p.slug,
			titulo: p.titulo,
			categoria: categoria.get(p.categoria) ?? 0,
			nivel: p.nivel,
			regiones: p.regiones.flatMap((r) => region.get(r.codigo) ?? []),
			comunas: p.comunas.join(', '),
			inicio: p.inicio,
			fin: p.fin,
			dia: diaChile(p.fin),
			versiones: p.versiones.length,
			borrada: p.borrada,
			conBorrados: p.conBorrados,
			vigente: p.vigente
		}))
	};
}

/** Current text of each publication plus the titles of its earlier versions, so old wording is still findable. */
export function crearTexto(archivo: Archivo): TextoArchivo {
	return {
		generado: archivo.generado,
		textos: archivo.publicaciones.map((p) => {
			const titulos = [...new Set(p.versiones.map((v) => v.titulo))].filter((t) => t !== p.titulo);
			return [textoPlano(p.actual.contenido), p.provincias.join(', '), ...titulos].filter(Boolean).join(' \n');
		})
	};
}
