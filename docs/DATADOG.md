# Datadog — API Gateway

Scope / common tag: **`app:api-gateway`** (+ `env:local|produccion`).

Auth: env `DDAPI`. Sin key → Micrometer local (no exporta).

## Métricas

| Métrica | Tipo | Tags | Descripción |
|---------|------|------|-------------|
| `gateway.requests` | counter | `route`, `status` | Requests HTTP (proxied + propios) |
| `gateway.request.duration` | timer | `route`, `status` | Latencia por request |
| `gateway.errors` | counter | `route` | Errores reactivos en el filtro |
| `gateway.rate_limited` | counter | `path` | Respuestas 429 del rate limit |
| `gateway.admin.wake` | counter | `scope`, `resultado` [, `service`] | Wake de backends |
| `gateway.admin.clean` | counter | `resultado` | Clean fan-out a los 4 módulos |

`route` posibles: `dye`, `donaciones`, `logistica`, `incentivos`, `admin`, `gateway`, `unknown`.

## Query útil

```
avg:gateway.requests{app:api-gateway,env:produccion} by {route}
avg:gateway.request.duration{app:api-gateway} by {route}
sum:gateway.rate_limited{app:api-gateway}.as_count()
```

## Render

Setear `DDAPI` (secret) y `APP_ENV=produccion` en el Web Service del gateway.
