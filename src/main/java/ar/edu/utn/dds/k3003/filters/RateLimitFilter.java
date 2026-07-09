package ar.edu.utn.dds.k3003.filters;

import ar.edu.utn.dds.k3003.config.GatewayProperties;
import java.net.InetSocketAddress;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/**
 * Rate limit por IP (in-memory, sin Redis). Protege los backends en Render free tier ante picos o
 * abuso accidental.
 */
@Component
public class RateLimitFilter implements WebFilter, Ordered {

  private static final long WINDOW_MS = 60_000L;

  private final GatewayProperties properties;
  private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();

  public RateLimitFilter(GatewayProperties properties) {
    this.properties = properties;
  }

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
    String path = exchange.getRequest().getURI().getPath();
    if (properties.rateLimit() == null || !properties.rateLimit().enabled()
        || path.startsWith("/actuator")
        || path.equals("/health")
        || path.equals("/")) {
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

    exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
    exchange.getResponse().getHeaders().add("Retry-After", "60");
    return exchange.getResponse().setComplete();
  }

  @Override
  public int getOrder() {
    return Ordered.HIGHEST_PRECEDENCE + 10;
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

  private static String resolveClientKey(ServerWebExchange exchange) {
    InetSocketAddress remote = exchange.getRequest().getRemoteAddress();
    if (remote != null && remote.getAddress() != null) {
      return remote.getAddress().getHostAddress();
    }
    return "unknown";
  }
}
