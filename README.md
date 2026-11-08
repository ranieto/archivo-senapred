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
