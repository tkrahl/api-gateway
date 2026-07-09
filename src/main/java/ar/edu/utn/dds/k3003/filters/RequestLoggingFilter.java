package ar.edu.utn.dds.k3003.filters;

import io.micrometer.core.instrument.MeterRegistry;
import java.util.UUID;
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
  private static final String REQUEST_ID_HEADER = "X-Request-Id";

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

    String requestId = request.getHeaders().getFirst(REQUEST_ID_HEADER);
    if (requestId == null || requestId.isBlank()) {
      requestId = UUID.randomUUID().toString();
    }

    String route = resolveRoute(path);
    String finalRequestId = requestId;

    ServerHttpRequest mutated =
        request
            .mutate()
            .header(REQUEST_ID_HEADER, finalRequestId)
            .header("X-Forwarded-By", "donatrack-api-gateway")
            .build();

    long start = System.currentTimeMillis();

    return chain
        .filter(exchange.mutate().request(mutated).build())
        .doOnSuccess(
            ignored -> {
              int status = exchange.getResponse().getStatusCode() != null
                  ? exchange.getResponse().getStatusCode().value()
                  : 0;
              long elapsed = System.currentTimeMillis() - start;
              registry
                  .counter("gateway.requests", "route", route, "status", String.valueOf(status))
                  .increment();
              log.info(
                  "gateway route={} method={} path={} status={} ms={} requestId={}",
                  route,
                  request.getMethod(),
                  path,
                  status,
                  elapsed,
                  finalRequestId);
            })
        .doOnError(
            error -> {
              registry.counter("gateway.errors", "route", route).increment();
              log.warn(
                  "gateway route={} path={} error={} requestId={}",
                  route,
                  path,
                  error.getMessage(),
                  finalRequestId);
            });
  }

  @Override
  public int getOrder() {
    return Ordered.HIGHEST_PRECEDENCE;
  }

  static String resolveRoute(String path) {
    if (path.startsWith("/dye")) {
      return "dye";
    }
    if (path.startsWith("/donaciones")) {
      return "donaciones";
    }
    if (path.startsWith("/logistica")) {
      return "logistica";
    }
    if (path.startsWith("/incentivos")) {
      return "incentivos";
    }
    if (path.equals("/health") || path.equals("/")) {
      return "gateway";
    }
    return "unknown";
  }
}
