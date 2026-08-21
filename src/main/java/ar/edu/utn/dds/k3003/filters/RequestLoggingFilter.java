package ar.edu.utn.dds.k3003.filters;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class RequestLoggingFilter implements GlobalFilter, Ordered {

  private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);
  public static final String REQUEST_ID_HEADER = "x-request-id";

  private final MeterRegistry registry;

  public RequestLoggingFilter(MeterRegistry registry) {
    this.registry = registry;
  }

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    ServerHttpRequest request = exchange.getRequest();
    String path = request.getURI().getPath();

    if (path.startsWith("/actuator")) {
      return chain.filter(exchange);
    }

    String incomingId = request.getHeaders().getFirst(REQUEST_ID_HEADER);
    String requestId =
        (incomingId == null || incomingId.isBlank())
            ? UUID.randomUUID().toString()
            : incomingId;

    String route = resolveRoute(path);
    String finalRequestId = requestId;

    ServerHttpRequest mutated =
        request
            .mutate()
            .headers(
                headers -> {
                  headers.set(REQUEST_ID_HEADER, finalRequestId);
                  headers.set("X-Forwarded-By", "donatrack-api-gateway");
                })
            .build();

    exchange.getResponse().getHeaders().set(REQUEST_ID_HEADER, finalRequestId);

    log.info(
        "Incoming request requestId={} method={} path={} query={} remote={} headers={}",
        finalRequestId,
        mutated.getMethod(),
        path,
        mutated.getURI().getRawQuery(),
        mutated.getRemoteAddress(),
        mutated.getHeaders());

    long start = System.currentTimeMillis();

    return chain
        .filter(exchange.mutate().request(mutated).build())
        .doOnSuccess(
            ignored -> {
              int status =
                  exchange.getResponse().getStatusCode() != null
                      ? exchange.getResponse().getStatusCode().value()
                      : 0;
              long elapsed = System.currentTimeMillis() - start;
              String statusTag = String.valueOf(status);
              registry
                  .counter("gateway.requests", "route", route, "status", statusTag)
                  .increment();
              Timer.builder("gateway.request.duration")
                  .tag("route", route)
                  .tag("status", statusTag)
                  .register(registry)
                  .record(elapsed, TimeUnit.MILLISECONDS);
              log.info(
                  "Outgoing response requestId={} route={} method={} path={} status={} headers={} ms={}",
                  finalRequestId,
                  route,
                  mutated.getMethod(),
                  path,
                  status,
                  exchange.getResponse().getHeaders(),
                  elapsed);
            })
        .doOnError(
            error -> {
              registry.counter("gateway.errors", "route", route).increment();
              log.warn(
                  "Outgoing response requestId={} route={} path={} error={}",
                  finalRequestId,
                  route,
                  path,
                  error.getMessage());
            });
  }

  @Override
  public int getOrder() {
    return Ordered.HIGHEST_PRECEDENCE;
  }

  static String resolveRoute(String path) {
    if (path.startsWith("/api/dye")) {
      return "dye";
    }
    if (path.startsWith("/api/donaciones")) {
      return "donaciones";
    }
    if (path.startsWith("/api/logistica")) {
      return "logistica";
    }
    if (path.startsWith("/api/incentivos")) {
      return "incentivos";
    }
    if (path.startsWith("/admin")) {
      return "admin";
    }
    if (path.equals("/health") || path.equals("/")) {
      return "gateway";
    }
    return "unknown";
  }
}
