import { cargarArchivo } from '#lib/server/archivo.ts';
import type { PageServerLoad } from './$types';

export const csr = false;

export const load: PageServerLoad = () => {
	const { publicaciones, recolectado } = cargarArchivo();
	return {
		recolectado,
		publicaciones: publicaciones.length,
		versiones: publicaciones.reduce((n, p) => n + p.versiones.length, 0),
		desde: publicaciones.at(-1)?.inicio ?? recolectado
	};
};
