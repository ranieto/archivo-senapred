const ZONA = 'America/Santiago';

const formatoDia = new Intl.DateTimeFormat('en-CA', {
	timeZone: ZONA,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

const formatoLargo = new Intl.DateTimeFormat('es-CL', {
	timeZone: ZONA,
	day: 'numeric',
	month: 'long',
	year: 'numeric'
});

const formatoHora = new Intl.DateTimeFormat('es-CL', {
	timeZone: ZONA,
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

const formatoCorto = new Intl.DateTimeFormat('es-CL', {
	timeZone: ZONA,
	day: 'numeric',
	month: 'short'
});

const formatoMes = new Intl.DateTimeFormat('es-CL', {
	timeZone: 'UTC',
	month: 'long',
	year: 'numeric'
});

const formatoMesCorto = new Intl.DateTimeFormat('es-CL', {
	timeZone: 'UTC',
	month: 'short'
});

/** Calendar day in Chile, as `YYYY-MM-DD`. */
export function diaChile(iso: string | Date): string {
	return formatoDia.format(typeof iso === 'string' ? new Date(iso) : iso);
}

export function fechaLarga(iso: string): string {
	return formatoLargo.format(new Date(iso));
}

export function hora(iso: string): string {
	return formatoHora.format(new Date(iso));
}

export function fechaCorta(iso: string): string {
	return formatoCorto.format(new Date(iso)).replace('.', '');
}

export function fechaHoraLarga(iso: string): string {
	return `${fechaLarga(iso)}, ${hora(iso)}`;
}

/** `mes` is `YYYY-MM`. */
export function nombreMes(mes: string): string {
	return formatoMes.format(new Date(`${mes}-15T12:00:00Z`));
}

export function nombreMesCorto(mes: string): string {
	return formatoMesCorto.format(new Date(`${mes}-15T12:00:00Z`)).replace('.', '');
}

/** Day parts of a `YYYY-MM-DD` string for the date column of a result row. */
export function partesDia(dia: string): { dia: number; mes: string; anio: string } {
	const [anio = '', mes = '', d = ''] = dia.split('-');
	return { dia: Number(d), mes: nombreMesCorto(`${anio}-${mes}`), anio };
}

export function sumarDias(dia: string, dias: number): string {
	const fecha = new Date(`${dia}T12:00:00Z`);
	fecha.setUTCDate(fecha.getUTCDate() + dias);
	return fecha.toISOString().slice(0, 10);
}
