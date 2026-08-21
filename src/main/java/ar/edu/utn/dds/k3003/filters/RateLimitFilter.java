package ar.edu.utn.dds.k3003.filters;

import ar.edu.utn.dds.k3003.config.GatewayProperties;
import java.net.InetSocketAddress;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/**
 * Rate limit por IP (in-memory, sin Redis). Protege los backends en Render free tier ante picos o
 * abuso accidental.
 *
 * <p>En Render, {@code getRemoteAddress()} suele ser el proxy: sin {@code X-Forwarded-For} todo el
 * tráfico comparte un solo cupo y el bot Telegram recibe 429 aunque Postman directo a DyE funcione.
 */
@Component
public class RateLimitFilter implements WebFilter, Ordered {

  private static final Logger LOG = LoggerFactory.getLogger(RateLimitFilter.class);
  private static final long WINDOW_MS = 60_000L;
  static final String CLIENT_HEADER = "X-DonaTrack-Client";
  static final String BOT_CLIENT = "telegram-bot";

  private final GatewayProperties properties;
  private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();

  public RateLimitFilter(GatewayProperties properties) {
    this.properties = properties;
  }

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
    String path = exchange.getRequest().getURI().getPath();
    if (shouldSkip(exchange, path)) {
      return chain.filter(exchange);
    }

    String clientKey = resolveClientKey(exchange);
    WindowCounter counter =
        counters.computeIfAbsent(
            clientKey,
            ignored ->
                new WindowCounter(
                    properties.rateLimit() != null
                        ? properties.rateLimit().requestsPerMinute()
                        : 120));

    if (counter.tryAcquire()) {
      return chain.filter(exchange);
    }

    LOG.warn("rate-limit 429 path={} client={}", path, clientKey);
    exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
    exchange.getResponse().getHeaders().add("Retry-After", "60");
    exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
    byte[] body =
        "{\"error\":\"rate_limited\",\"message\":\"Rate limit del API Gateway (por IP)\"}"
            .getBytes(java.nio.charset.StandardCharsets.UTF_8);
    return exchange
        .getResponse()
        .writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(body)));
  }

  @Override
  public int getOrder() {
    return Ordered.HIGHEST_PRECEDENCE + 10;
  }

  private boolean shouldSkip(ServerWebExchange exchange, String path) {
    if (properties.rateLimit() == null || !properties.rateLimit().enabled()) {
      return true;
    }
    if (path.startsWith("/actuator")
        || path.equals("/health")
        || path.equals("/")
        || path.startsWith("/admin/")) {
      return true;
    }
    if (BOT_CLIENT.equalsIgnoreCase(exchange.getRequest().getHeaders().getFirst(CLIENT_HEADER))) {
      return true;
    }
    return isAdminBearer(exchange);
  }

  private boolean isAdminBearer(ServerWebExchange exchange) {
    String expected = properties.adminSecret();
    if (expected == null || expected.isBlank()) {
      return false;
    }
    String authorization = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
    if (authorization == null) {
      return false;
    }
    String prefix = "Bearer ";
    if (!authorization.regionMatches(true, 0, prefix, 0, prefix.length())) {
      return false;
    }
    return expected.equals(authorization.substring(prefix.length()).trim());
  }

  static String resolveClientKey(ServerWebExchange exchange) {
    String forwarded = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) {
      return forwarded.split(",")[0].trim();
    }
    String realIp = exchange.getRequest().getHeaders().getFirst("X-Real-IP");
    if (realIp != null && !realIp.isBlank()) {
      return realIp.trim();
    }
    InetSocketAddress remote = exchange.getRequest().getRemoteAddress();
    if (remote != null && remote.getAddress() != null) {
      return remote.getAddress().getHostAddress();
    }
    return "unknown";
  }

  static final class WindowCounter {
    private final int maxRequests;
    private final AtomicInteger count = new AtomicInteger(0);
    private volatile long windowStartMs = System.currentTimeMillis();

    WindowCounter(int maxRequests) {
      this.maxRequests = Math.max(maxRequests, 1);
    }

    synchronized boolean tryAcquire() {
      long now = System.currentTimeMillis();
      if (now - windowStartMs >= WINDOW_MS) {
        windowStartMs = now;
        count.set(0);
      }
      return count.incrementAndGet() <= maxRequests;
    }
  }
}
