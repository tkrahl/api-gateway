package ar.edu.utn.dds.k3003.controllers;

import ar.edu.utn.dds.k3003.config.GatewayProperties;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * Probe del bot Telegram para el dashboard. El navegador no puede leer
 * {@code https://telegram-bot-.../health} por CORS; este endpoint (mismo origen) sí le pega al
 * {@code GET /health} del bot. No modifica {@code GET /health} del gateway.
 */
@RestController
@RequestMapping("/admin")
public class AdminBotHealthController {

  private final GatewayProperties properties;
  private final WebClient webClient;

  public AdminBotHealthController(
      GatewayProperties properties, WebClient.Builder webClientBuilder) {
    this.properties = properties;
    this.webClient = webClientBuilder.build();
  }

  @GetMapping(value = "/bot-health", produces = MediaType.APPLICATION_JSON_VALUE)
  public Mono<Map<String, Object>> botHealth() {
    String url = trimSlash(properties.telegramBotUrl()) + "/health";
    long started = System.nanoTime();
    return webClient
        .get()
        .uri(url)
        .retrieve()
        .bodyToMono(String.class)
        .timeout(Duration.ofSeconds(Math.max(properties.healthBackendTimeoutSec(), 10)))
        .map(
            body -> {
              Map<String, Object> out = base(url, started);
              out.put("status", "UP");
              return out;
            })
        .onErrorResume(
            error -> {
              Map<String, Object> out = base(url, started);
              out.put("status", "DOWN");
              out.put("error", error.getMessage());
              return Mono.just(out);
            });
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
