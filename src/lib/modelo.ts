export type Tipo = 'evento' | 'alerta';

export type Nivel = 'preventiva' | 'amarilla' | 'roja';

export const TIPOS: readonly Tipo[] = ['evento', 'alerta'];

export const NIVELES: readonly Nivel[] = ['preventiva', 'amarilla', 'roja'];

export const NOMBRE_NIVEL: Record<Nivel, string> = {
	preventiva: 'Temprana Preventiva',
	amarilla: 'Amarilla',
	roja: 'Roja'
};

export const NOMBRE_TIPO: Record<Tipo, { singular: string; plural: string }> = {
	evento: { singular: 'Evento', plural: 'Eventos' },
	alerta: { singular: 'Alerta', plural: 'Alertas' }
};

export function esTipo(valor: string): valor is Tipo {
	return valor === 'evento' || valor === 'alerta';
}

export function esNivel(valor: string): valor is Nivel {
	return valor === 'preventiva' || valor === 'amarilla' || valor === 'roja';
}

export interface RegionIndice {
	codigo: string;
	nombre: string;
	corto: string;
	slug: string;
}

export interface CategoriaIndice {
	nombre: string;
	slug: string;
}

/** One row per publication. Dates are ISO instants; `dia` is the Chilean calendar day of `fin`, the latest version. */
export interface FilaIndice {
	tipo: Tipo;
	slug: string;
	titulo: string;
	categoria: number;
	nivel: Nivel | null;
	regiones: number[];
	comunas: string;
	inicio: string;
	fin: string;
	dia: string;
	versiones: number;
	borrada: boolean;
	conBorrados: boolean;
	vigente: boolean;
}

export interface IndiceArchivo {
	generado: string;
	recolectado: string;
	categorias: CategoriaIndice[];
	regiones: RegionIndice[];
	publicaciones: FilaIndice[];
}

/** Text index rows, aligned by position with `IndiceArchivo.publicaciones`. */
export interface TextoArchivo {
	generado: string;
	textos: string[];
}
