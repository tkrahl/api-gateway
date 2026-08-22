package ar.edu.utn.dds.k3003.controllers;

import ar.edu.utn.dds.k3003.config.GatewayProperties;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * Probe del bot Telegram para el dashboard. El navegador no puede leer
 * {@code https://telegram-bot-.../health} por CORS; este endpoint (mismo origen) sí le pega al
 * {@code GET /health} del bot. No modifica {@code GET /health} del gateway.
 *
 * <p>En cold start de Render free, pings repetidos a {@code /health} reciben 429 del edge. No se
 * reintenta (amplifica el rate-limit) y se cachea WARMING un rato para que el auto-refresh del
 * dashboard no quede en loop.
 */
@RestController
@RequestMapping("/admin")
public class AdminBotHealthController {

  static final long RATE_LIMIT_COOLDOWN_MS = 30_000L;

  private final GatewayProperties properties;
  private final WebClient webClient;
  private final Object cooldownLock = new Object();
  private volatile long cooldownUntilMs;
  private volatile Map<String, Object> cooldownBody;

  public AdminBotHealthController(
      GatewayProperties properties, WebClient.Builder webClientBuilder) {
    this.properties = properties;
    this.webClient = webClientBuilder.build();
  }

  @GetMapping(value = "/bot-health", produces = MediaType.APPLICATION_JSON_VALUE)
  public Mono<Map<String, Object>> botHealth() {
    Map<String, Object> cached = cachedIfCoolingDown();
    if (cached != null) {
      return Mono.just(cached);
    }

    String url = trimSlash(properties.telegramBotUrl()) + "/health";
    long started = System.nanoTime();
    return webClient
        .get()
        .uri(url)
        .exchangeToMono(response -> toStatus(response).map(code -> fromHttp(url, started, code)))
        .timeout(Duration.ofSeconds(Math.max(properties.healthBackendTimeoutSec(), 10)))
        .doOnNext(this::rememberIfRateLimited)
        .onErrorResume(
            error -> {
              Map<String, Object> out = base(url, started);
              out.put("status", "DOWN");
              out.put("error", error.getMessage());
              return Mono.just(out);
            });
  }

  private Map<String, Object> cachedIfCoolingDown() {
    long now = System.currentTimeMillis();
    if (now >= cooldownUntilMs) {
      return null;
    }
    Map<String, Object> body = cooldownBody;
    if (body == null) {
      return null;
    }
    Map<String, Object> copy = new LinkedHashMap<>(body);
    copy.put("cached", true);
    return copy;
  }

  private void rememberIfRateLimited(Map<String, Object> body) {
    if (!"WARMING".equals(body.get("status"))) {
      synchronized (cooldownLock) {
        cooldownUntilMs = 0L;
        cooldownBody = null;
      }
      return;
    }
    synchronized (cooldownLock) {
      cooldownUntilMs = System.currentTimeMillis() + RATE_LIMIT_COOLDOWN_MS;
      cooldownBody = Map.copyOf(body);
    }
  }

  private static Mono<Integer> toStatus(ClientResponse response) {
    HttpStatusCode status = response.statusCode();
    return response.releaseBody().thenReturn(status.value());
  }

  private static Map<String, Object> fromHttp(String url, long startedNanos, int httpStatus) {
    Map<String, Object> out = base(url, startedNanos);
    out.put("httpStatus", httpStatus);
    if (httpStatus >= 200 && httpStatus < 300) {
      out.put("status", "UP");
    } else if (httpStatus == 429) {
      out.put("status", "WARMING");
      out.put(
          "error",
          "429 Too Many Requests en GET /health (cold start de Render). "
              + "No se reintenta para no alimentar el rate-limit.");
    } else {
      out.put("status", "DOWN");
      out.put("error", "HTTP " + httpStatus);
    }
    return out;
  }

  private static Map<String, Object> base(String url, long startedNanos) {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("url", url);
    out.put("latencyMs", Math.max(0, (System.nanoTime() - startedNanos) / 1_000_000L));
    return out;
  }

  private static String trimSlash(String base) {
    if (base == null || base.isBlank()) {
      return "https://telegram-bot-z236.onrender.com";
    }
    return base.replaceAll("/+$", "");
  }
}
