# Archivo SENAPRED

Archivo no oficial de los eventos y alertas que SENAPRED publica en [senapred.cl/eventos](https://senapred.cl/eventos).

## Datos

`data/` guarda un JSON por registro, tal como lo devuelve la API pública del sitio oficial:

- `data/eventos/AAAA/MM/<id>.json` y `data/alertas/AAAA/MM/<id>.json`, agrupados por la fecha de creación del registro (`createdAt`).
- `data/catalogos/` tiene regiones, provincias, comunas, categorías y tipos de alerta.
- `data/ausentes.json` lista los registros archivados que la API dejó de devolver, con la fecha en que se notó por primera vez.

Cada publicación del sitio oficial reúne varios registros con la misma `urlAccess`, encadenados por `parentId`. Cada actualización es un registro nuevo.

Cuando SENAPRED borra un registro, no lo elimina. Lo marca con `isDeleted: true` y sobrescribe `fechaHora` con `2000-01-01`, `isPrincipal` con `false` y `parentId` con `"parent"`. El historial de git conserva los valores anteriores a partir de la primera foto que los capturó.

## Recolector

`collector/recolectar.ts` no tiene dependencias. Obtiene credenciales de invitado de Cognito, consulta la API GraphQL (AppSync) y escribe solo los archivos que cambiaron.

```sh
node collector/recolectar.ts
```

Necesita Node 22.18 o superior. El workflow `.github/workflows/recolectar.yml` lo corre cada 8 horas (01:17, 09:17 y 17:17 UTC) y hace commit de los cambios.

## Sitio

El sitio es SvelteKit 3 con `adapter-static`. Lee `data/` al compilar y genera una página por publicación, más dos índices para la búsqueda.

```sh
npm install
npm run dev       # desarrollo
npm run build     # sitio estático en build/
npm run preview   # sirve build/ en http://localhost:4173
npm run check     # tipos
npm test          # pruebas unitarias
```

`build/` usa rutas relativas, así que se puede publicar en cualquier carpeta de un servidor estático.

- `src/lib/server/archivo.ts` convierte los registros en publicaciones con sus versiones. Es el único lugar que interpreta los JSON de `data/`.
- `indice.json` tiene una fila por publicación y alimenta los filtros. `texto.json` tiene el texto de cada publicación y se carga después, para la búsqueda de texto completo.
- `src/lib/buscador.ts` filtra y busca en el navegador. Todo el estado de la búsqueda vive en la URL.

`scripts/verificar.ts` recorre el sitio compilado con Playwright: busca, filtra, abre una publicación y revisa que la URL conserve los filtros. Con `npm run preview` corriendo:

```sh
npx playwright install chromium
npm run verificar
```

`scripts/capturas.ts <url> <carpeta>` guarda capturas de la portada y de una publicación en escritorio y teléfono, en modo claro y oscuro.
