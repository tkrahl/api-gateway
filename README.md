# API Gateway — DonaTrack

Punto de entrada único HTTP para clientes externos (bot Telegram, Postman, e2e).

**Producción:** https://api-gateway-1ujg.onrender.com

## ¿Por qué un API Gateway?

| Beneficio | Qué resuelve en DonaTrack |
|-----------|---------------------------|
| **Un solo URL** | El bot y Postman apuntan a `https://api-gateway-1ujg.onrender.com` en vez de recordar 4 URLs |
| **Ocultar backends** | Los microservicios no se exponen directamente a clientes externos |
| **CORS centralizado** | El bot/web puede llamar desde cualquier origen sin tocar cada módulo |
| **Trazabilidad** | `X-Request-Id` propagado a todos los backends + logs y métricas `gateway.requests` |
| **Health agregado** | `GET /health` consulta los 4 módulos en un solo request |
| **Evolución** | Mañana podés agregar auth, circuit breaker o cache sin cambiar el bot |

> La comunicación **módulo ↔ módulo** sigue siendo HTTP directo. El gateway es para **clientes externos**.

## Rutas

| Prefix gateway | Backend |
|----------------|---------|
| `/api/dye/**` | Donadores y Entidades |
| `/api/donaciones/**` | Donaciones |
| `/api/logistica/**` | Logística |
| `/api/incentivos/**` | Incentivos |

Endpoints propios del gateway (fuera de `/api`): `GET /`, `GET /health`, `/actuator/**`

Ejemplo:

```bash
# Antes (directo)
curl https://donadores-entidades.onrender.com/donadores

# Ahora (vía gateway)
curl https://api-gateway-1ujg.onrender.com/api/dye/donadores
```

## Features incluidas

- **Routing** con `StripPrefix=2` (quita `/api/{modulo}` antes de proxear)
- **CORS** configurable
- **Request logging** + header `X-Request-Id`
- **Métricas** Micrometer → Datadog (`app:api-gateway`)
- **Deploy** Docker + Render Blueprint

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DYE_URL` | donadores-entidades.onrender.com | Backend DyE |
| `DONACIONES_URL` | donaciones-dgs7.onrender.com | Backend Donaciones |
| `LOGISTICA_URL` | logisticaweb.onrender.com | Backend Logística |
| `INCENTIVOS_URL` | incentivos-movn.onrender.com | Backend Incentivos |
| `DDAPI` | — | API key Datadog |
| `CORS_ALLOWED_ORIGINS` | `*` | Orígenes CORS (coma-separados) |
| `PORT` | `8080` | Puerto (Render lo setea) |

## Desarrollo local

```bash
mvn spring-boot:run
```

```bash
curl http://localhost:8080/
curl http://localhost:8080/health
curl http://localhost:8080/api/dye/donadores
```

## Tests

```bash
mvn test
```

## Deploy en Render

1. Conectar repo `api-gateway`
2. Aplicar Blueprint (`render.yaml`) o crear Web Service Docker
3. Configurar `DDAPI` y URLs si difieren del default

## Documentacion API

| Archivo | Uso |
|---------|-----|
| [`docs/resources/donatrack-api-gateway.yaml`](./docs/resources/donatrack-api-gateway.yaml) | OpenAPI 3.0 — importar en Swagger UI / SwaggerHub |
| [`docs/resources/insomnia.yaml`](./docs/resources/insomnia.yaml) | Coleccion Insomnia — **Import → From File** |

**Insomnia:** elegir entorno **Render (Gateway)** (`https://api-gateway-1ujg.onrender.com`).

**Swagger local:** pegar el YAML en [editor.swagger.io](https://editor.swagger.io) o servir con springdoc si se agrega despues.

## Próximas mejoras posibles

- API key / JWT para comandos admin del bot
- Circuit breaker (Resilience4j) si un backend cae
- Cache de lecturas frecuentes (`GET /insignias`, catálogo)
