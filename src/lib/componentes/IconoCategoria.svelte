<script lang="ts">
	import { estiloCategoria } from '#lib/categorias.ts';

	let { categoria, tamano = 18 }: { categoria: string; tamano?: number } = $props();

	const estilo = $derived(estiloCategoria(categoria));
</script>

<span class="icono" style:--color="var(--fam-{estilo.familia})" style:--tamano="{tamano}px">
	<estilo.icono size={tamano} strokeWidth={1.9} aria-hidden="true" />
</span>

<style>
	.icono {
		display: inline-grid;
		place-items: center;
		flex: none;
		width: calc(var(--tamano) * 1.9);
		height: calc(var(--tamano) * 1.9);
		border-radius: 50%;
		color: var(--color);
		background: color-mix(in oklab, var(--color) 13%, transparent);
	}
</style>
