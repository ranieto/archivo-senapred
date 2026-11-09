<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Fila } from '#lib/buscador.ts';
	import { fechaCorta, partesDia } from '#lib/fechas.ts';
	import type { IndiceArchivo } from '#lib/modelo.ts';
	import { resaltar } from '#lib/resaltar.ts';
	import IconoCategoria from './IconoCategoria.svelte';
	import Insignias from './Insignias.svelte';

	let {
		fila,
		indice,
		terminos,
		fragmento,
		conAnio
	}: {
		fila: Fila;
		indice: IndiceArchivo;
		terminos: string[];
		fragmento: string | null;
		conAnio: boolean;
	} = $props();

	const pub = $derived(fila.pub);
	const categoria = $derived(indice.categorias[pub.categoria]?.nombre ?? 'Otros');
	const regiones = $derived(pub.regiones.flatMap((r) => indice.regiones[r]?.corto ?? []));
	const fecha = $derived(partesDia(pub.dia));
	const cancelada = $derived(/^se cancela/i.test(pub.titulo));
</script>

<a
	class="resultado"
	class:borrada={pub.borrada}
	href={resolve('/[tipo=tipo]/[slug]', { tipo: pub.tipo, slug: pub.slug })}
	data-sveltekit-reload
>
	<span class="fecha" aria-hidden="true">
		<span class="dia">{fecha.dia}</span>
		<span class="mes">{fecha.mes}</span>
		{#if conAnio}<span class="mes">{fecha.anio}</span>{/if}
	</span>
	<span class="cuerpo">
		<span class="categoria">
			<IconoCategoria {categoria} tamano={13} />
			{categoria}
		</span>
		<span class="titulo">
			{#each resaltar(pub.titulo, terminos) as tramo, i (i)}{#if tramo.marcado}<mark>{tramo.texto}</mark>{:else}{tramo.texto}{/if}{/each}
		</span>
		{#if fragmento}
			<span class="fragmento">
				{#each resaltar(fragmento, terminos) as tramo, i (i)}{#if tramo.marcado}<mark>{tramo.texto}</mark>{:else}{tramo.texto}{/if}{/each}
			</span>
		{/if}
		<span class="meta">
			<span class="solo-lectores">{fechaCorta(pub.fin)} {fecha.anio}.</span>
			{#if regiones.length}
				<span class="lugar">{regiones.length > 3 ? `${regiones.length} regiones` : regiones.join(', ')}</span>
			{/if}
			{#if pub.versiones > 1}
				<span class="versiones">{pub.versiones} versiones</span>
			{/if}
			<Insignias
				nivel={pub.nivel}
				vigente={pub.vigente}
				{cancelada}
				borrada={pub.borrada}
				compacta
			/>
		</span>
	</span>
</a>

<style>
	.resultado {
		display: grid;
		grid-template-columns: 3.4rem 1fr;
		gap: 0.9rem;
		padding: 0.95rem 0.75rem 1rem;
		margin-inline: -0.75rem;
		border-radius: var(--radio);
		color: inherit;
		text-decoration: none;
	}
	.resultado:hover {
		background: var(--papel-hundido);
	}
	.resultado:hover .titulo {
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 0.18em;
	}
	.fecha {
		display: grid;
		justify-items: end;
		align-content: start;
		padding-top: 0.1rem;
		font-variant-numeric: tabular-nums lining-nums;
	}
	.dia {
		font-family: var(--serif);
		font-size: 1.6rem;
		font-weight: 500;
		font-variation-settings: 'opsz' 40;
		line-height: 1;
	}
	.dia + .mes {
		margin-top: 0.2rem;
	}
	.mes {
		font-size: 0.78rem;
		color: var(--tinta-3);
		white-space: nowrap;
	}
	.cuerpo {
		display: grid;
		gap: 0.3rem;
		min-width: 0;
	}
	.categoria {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.82rem;
		color: var(--tinta-2);
		margin-left: -0.1rem;
	}
	.titulo {
		font-family: var(--serif);
		font-size: 1.1rem;
		font-weight: 500;
		font-variation-settings: 'opsz' 20;
		line-height: 1.35;
		text-wrap: pretty;
	}
	.borrada .titulo {
		color: var(--tinta-2);
	}
	.fragmento {
		font-size: 0.9rem;
		line-height: 1.5;
		color: var(--tinta-2);
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.9rem;
		font-size: 0.84rem;
		color: var(--tinta-3);
	}
	@media (max-width: 34rem) {
		.resultado {
			grid-template-columns: 2.4rem 1fr;
			gap: 0.7rem;
		}
		.dia {
			font-size: 1.35rem;
		}
		.titulo {
			font-size: 1.04rem;
		}
	}
</style>
