<script lang="ts">
	import { resolve } from '$app/paths';
	import { fechaLarga } from '#lib/fechas.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const n = (x: number) => x.toLocaleString('es-CL');
</script>

<svelte:head>
	<title>Acerca del archivo | Archivo SENAPRED</title>
	<meta name="description" content="Qué es este archivo no oficial de los eventos y alertas de SENAPRED." />
</svelte:head>

<article class="acerca">
	<h1>Acerca del archivo</h1>

	<p class="entrada">
		Este sitio guarda todo lo que SENAPRED publica en
		<a href="https://senapred.cl/eventos" rel="noopener noreferrer">senapred.cl/eventos</a>: los eventos (sismos,
		incendios, cortes de suministro, actividad volcánica y más) y las alertas (Temprana Preventiva, Amarilla y Roja).
	</p>

	<dl class="cifras">
		<div><dt>Publicaciones</dt><dd>{n(data.publicaciones)}</dd></div>
		<div><dt>Versiones</dt><dd>{n(data.versiones)}</dd></div>
		<div><dt>Desde</dt><dd>{fechaLarga(data.desde)}</dd></div>
		<div><dt>Última recolección</dt><dd>{fechaLarga(data.recolectado)}</dd></div>
	</dl>

	<h2>No es un sitio oficial</h2>
	<p>
		Esta página no tiene relación con SENAPRED ni con el Gobierno de Chile. El contenido de cada publicación es de
		SENAPRED y se reproduce tal como se publicó. Ante una emergencia en curso, sigue los canales oficiales.
	</p>

	<p class="volver"><a href={resolve('/')}>Volver a la búsqueda</a></p>
</article>

<style>
	.acerca {
		max-width: 40rem;
		margin: 0 auto;
		padding: 2.5rem 1.25rem 0;
		font-family: var(--serif);
		font-size: 1.06rem;
		line-height: 1.7;
	}
	h1 {
		font-size: clamp(2rem, 1.4rem + 2.5vw, 3rem);
		font-weight: 500;
		font-variation-settings: 'opsz' 72;
		letter-spacing: -0.02em;
	}
	h2 {
		margin-top: 2.25rem;
		margin-bottom: 0.5rem;
		font-size: 1.3rem;
		font-variation-settings: 'opsz' 30;
	}
	.entrada {
		margin-top: 1.25rem;
		font-size: 1.15rem;
	}
	.cifras {
		margin: 2rem 0 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
		gap: 1rem;
		padding: 1.1rem 0;
		border-block: 1px solid var(--linea);
		font-family: var(--sans);
	}
	.cifras dt {
		font-size: 0.8rem;
		color: var(--tinta-3);
	}
	.cifras dd {
		margin: 0;
		font-family: var(--serif);
		font-size: 1.25rem;
		font-variant-numeric: lining-nums;
	}
	.volver {
		margin-top: 2.5rem;
		font-family: var(--sans);
		font-size: 0.95rem;
	}
</style>
