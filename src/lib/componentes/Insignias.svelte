<script lang="ts">
	import { NOMBRE_NIVEL, type Nivel } from '#lib/modelo.ts';

	let {
		nivel = null,
		vigente = false,
		cancelada = false,
		borrada = false,
		compacta = false
	}: {
		nivel?: Nivel | null;
		vigente?: boolean;
		cancelada?: boolean;
		borrada?: boolean;
		compacta?: boolean;
	} = $props();
</script>

<span class="insignias" class:compacta>
	{#if nivel}
		<span class="insignia nivel {nivel}">Alerta {NOMBRE_NIVEL[nivel]}</span>
	{/if}
	{#if vigente}
		<span class="insignia vigente">Vigente</span>
	{/if}
	{#if cancelada}
		<span class="insignia estado">Cancelada</span>
	{/if}
	{#if borrada}
		<span class="insignia borrada">Borrada del sitio oficial</span>
	{/if}
</span>

<style>
	.insignias {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		vertical-align: middle;
	}
	.insignia {
		display: inline-flex;
		align-items: center;
		gap: 0.3em;
		font-size: 0.8rem;
		font-weight: 600;
		line-height: 1;
		padding: 0.32rem 0.55rem;
		border-radius: 999px;
		white-space: nowrap;
	}
	.compacta .insignia {
		font-size: 0.74rem;
		padding: 0.26rem 0.48rem;
	}
	.nivel.preventiva {
		color: var(--nivel-preventiva);
		background: var(--nivel-preventiva-fondo);
	}
	.nivel.amarilla {
		color: var(--nivel-amarilla);
		background: var(--nivel-amarilla-fondo);
	}
	.nivel.roja {
		color: var(--nivel-roja);
		background: var(--nivel-roja-fondo);
	}
	.vigente {
		color: var(--acento);
		background: var(--acento-suave);
	}
	.vigente::before {
		content: '';
		width: 0.45em;
		height: 0.45em;
		border-radius: 50%;
		background: currentColor;
	}
	.estado {
		color: var(--tinta-2);
		box-shadow: inset 0 0 0 1px var(--linea);
	}
	.borrada {
		color: var(--tinta-2);
		background: repeating-linear-gradient(
			-45deg,
			var(--papel-hundido) 0 4px,
			transparent 4px 8px
		);
		box-shadow: inset 0 0 0 1px var(--linea);
	}
</style>
