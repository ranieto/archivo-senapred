<script lang="ts">
	import { nombreMes } from '#lib/fechas.ts';

	let {
		meses,
		conteos,
		desde,
		hasta,
		elegir
	}: {
		/** Every month of the archive, `YYYY-MM`, oldest first. */
		meses: string[];
		conteos: Map<string, number>;
		desde: string | null;
		hasta: string | null;
		elegir: (mes: string) => void;
	} = $props();

	const maximo = $derived(Math.max(1, ...meses.map((m) => conteos.get(m) ?? 0)));
	const conRango = $derived(desde !== null || hasta !== null);
	let encima = $state<string | null>(null);

	function dentro(mes: string): boolean {
		return (desde === null || mes >= desde.slice(0, 7)) && (hasta === null || mes <= hasta.slice(0, 7));
	}
</script>

<figure class="histograma">
	<figcaption class="solo-lectores">Publicaciones por mes según los filtros actuales</figcaption>
	<div class="barras" role="group" aria-label="Publicaciones por mes" onmouseleave={() => (encima = null)}>
		{#each meses as mes (mes)}
			{@const n = conteos.get(mes) ?? 0}
			<button
				type="button"
				tabindex="-1"
				class="barra"
				class:fuera={conRango && !dentro(mes)}
				class:activa={encima === mes}
				aria-label="{nombreMes(mes)}: {n} publicaciones. Filtrar este mes"
				onmouseenter={() => (encima = mes)}
				onfocus={() => (encima = mes)}
				onclick={() => elegir(mes)}
			>
				<span class="relleno" style:height="{n === 0 ? 0 : Math.max(3, (n / maximo) * 100)}%"></span>
			</button>
		{/each}
	</div>
	<div class="eje" aria-hidden="true">
		{#each meses as mes, i (mes)}
			<span class="anio">{mes.endsWith('-01') || i === 0 ? mes.slice(0, 4) : ''}</span>
		{/each}
	</div>
	<p class="leyenda" aria-live="polite">
		{#if encima}
			<strong>{nombreMes(encima)}</strong>: {(conteos.get(encima) ?? 0).toLocaleString('es-CL')}
			{conteos.get(encima) === 1 ? 'publicación' : 'publicaciones'}.
		{:else}
			Publicaciones por mes, contando la original y sus actualizaciones. Elige una barra para ver solo ese mes.
		{/if}
	</p>
</figure>

<style>
	.histograma {
		margin: 0;
	}
	.barras {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 4.5rem;
		border-bottom: 1px solid var(--linea);
	}
	.barra {
		flex: 1 1 0;
		min-width: 0;
		height: 100%;
		padding: 0;
		border: 0;
		background: transparent;
		display: flex;
		align-items: flex-end;
		border-radius: 3px 3px 0 0;
	}
	.relleno {
		display: block;
		width: 100%;
		background: var(--acento);
		opacity: 0.75;
		border-radius: 3px 3px 0 0;
	}
	.fuera .relleno {
		background: var(--tinta-3);
		opacity: 0.3;
	}
	.barra.activa {
		background: var(--papel-hundido);
	}
	.barra.activa .relleno {
		opacity: 1;
	}
	.eje {
		display: flex;
		gap: 2px;
		font-size: 0.72rem;
		color: var(--tinta-3);
		font-variant-numeric: tabular-nums;
	}
	.anio {
		flex: 1 1 0;
		min-width: 0;
		overflow: visible;
		white-space: nowrap;
		padding-top: 0.2rem;
	}
	.leyenda {
		margin-top: 0.3rem;
		font-size: 0.8rem;
		color: var(--tinta-3);
		min-height: 1.2em;
	}
	@media (max-width: 34rem) {
		.barras {
			height: 3.25rem;
		}
	}
	.leyenda strong {
		color: var(--tinta-2);
	}
</style>
