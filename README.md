# API Gateway — DonaTrack

Punto de entrada único HTTP para clientes externos (bot Telegram, Postman, e2e).

## ¿Por qué un API Gateway?

| Beneficio | Qué resuelve en DonaTrack |
|-----------|---------------------------|
| **Un solo URL** | El bot y Postman apuntan a `https://api-gateway.onrender.com` en vez de recordar 4 URLs |
| **Ocultar backends** | Los microservicios no se exponen directamente a clientes externos |
| **Rate limiting** | Protege Render free tier ante picos o loops accidentales (120 req/min por IP, configurable) |
| **CORS centralizado** | El bot/web puede llamar desde cualquier origen sin tocar cada módulo |
| **Trazabilidad** | `X-Request-Id` propagado a todos los backends + logs y métricas `gateway.requests` |
| **Health agregado** | `GET /health` consulta los 4 módulos en un solo request |
| **Evolución** | Mañana podés agregar auth, circuit breaker o cache sin cambiar el bot |

> La comunicación **módulo ↔ módulo** sigue siendo HTTP directo. El gateway es para **clientes externos**.

## Rutas

| Prefix gateway | Backend |
|----------------|---------|
| `/dye/**` | Donadores y Entidades |
| `/donaciones/**` | Donaciones |
| `/logistica/**` | Logística |
| `/incentivos/**` | Incentivos |

Ejemplo:

```bash
# Antes (directo)
curl https://donadores-entidades.onrender.com/donadores

# Ahora (vía gateway)
curl https://<gateway-host>/dye/donadores
```

## Features incluidas

- **Routing** con `StripPrefix` (quita `/dye`, `/donaciones`, etc.)
- **Rate limit** in-memory por IP (ventana fija de 1 minuto, sin Redis)
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
| `RATE_LIMIT_ENABLED` | `true` | Activar rate limit |
| `RATE_LIMIT_RPM` | `120` | Requests por minuto por IP |
| `CORS_ALLOWED_ORIGINS` | `*` | Orígenes CORS (coma-separados) |
| `PORT` | `8080` | Puerto (Render lo setea) |

## Desarrollo local

```bash
mvn spring-boot:run
```

```bash
curl http://localhost:8080/
curl http://localhost:8080/health
curl http://localhost:8080/dye/donadores
```

## Tests

```bash
mvn test
```

## Deploy en Render

1. Conectar repo `api-gateway`
2. Aplicar Blueprint (`render.yaml`) o crear Web Service Docker
3. Configurar `DDAPI` y URLs si difieren del default

## Próximas mejoras posibles

- API key / JWT para comandos admin del bot
- Circuit breaker (Resilience4j) si un backend cae
- Redis para rate limit distribuido (multi-instancia)
- Cache de lecturas frecuentes (`GET /insignias`, catálogo)
