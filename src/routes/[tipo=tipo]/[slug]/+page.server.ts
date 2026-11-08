import { error } from '@sveltejs/kit';
import { cargarArchivo } from '#lib/server/archivo.ts';
import { crearDetalle } from '#lib/server/detalle.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const csr = false;

export const entries: EntryGenerator = () =>
	cargarArchivo().publicaciones.map((p) => ({ tipo: p.tipo, slug: p.slug }));

export const load: PageServerLoad = ({ params }) => {
	const publicacion = cargarArchivo().buscar(params.tipo, params.slug);
	if (!publicacion) error(404, 'Esta publicación no está en el archivo');
	return { detalle: crearDetalle(publicacion) };
};
