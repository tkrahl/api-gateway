package ar.edu.utn.dds.k3003.controllers;

import ar.edu.utn.dds.k3003.config.GatewayProperties;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
public class GatewayInfoController {

  private final GatewayProperties properties;
  private final WebClient webClient;

  public GatewayInfoController(GatewayProperties properties, WebClient.Builder webClientBuilder) {
    this.properties = properties;
    this.webClient = webClientBuilder.build();
  }

  @GetMapping(value = "/", produces = MediaType.APPLICATION_JSON_VALUE)
  public Map<String, Object> info() {
    Map<String, Object> routes = new LinkedHashMap<>();
    routes.put("dye", Map.of("prefix", "/api/dye", "target", properties.dyeUrl()));
    routes.put(
        "donaciones", Map.of("prefix", "/api/donaciones", "target", properties.donacionesUrl()));
    routes.put(
        "logistica", Map.of("prefix", "/api/logistica", "target", properties.logisticaUrl()));
    routes.put(
        "incentivos", Map.of("prefix", "/api/incentivos", "target", properties.incentivosUrl()));

    return Map.of(
        "service",
        "donatrack-api-gateway",
        "version",
        "1.0",
        "routes",
        routes,
        "features",
        List.of("routing", "rate-limit", "cors", "request-logging", "correlation-id", "metrics"));
  }

  @GetMapping(value = "/health", produces = MediaType.APPLICATION_JSON_VALUE)
  public Mono<Map<String, Object>> health() {
    Map<String, String> backends =
        Map.of(
            "dye", properties.dyeUrl() + "/actuator/health",
            "donaciones", properties.donacionesUrl() + "/actuator/health",
            "logistica", properties.logisticaUrl() + "/actuator/health",
            "incentivos", properties.incentivosUrl() + "/actuator/health");

    return Flux.fromIterable(backends.entrySet())
        .flatMap(
            entry ->
                webClient
                    .get()
                    .uri(entry.getValue())
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(properties.healthBackendTimeoutSec()))
                    .map(body -> Map.entry(entry.getKey(), (Object) Map.of("status", "UP")))
                    .onErrorResume(
                        error ->
                            Mono.just(
                                Map.entry(
                                    entry.getKey(),
                                    (Object)
                                        Map.of("status", "DOWN", "error", error.getMessage())))))
        .collectMap(Map.Entry::getKey, Map.Entry::getValue)
        .map(
            checks -> {
              boolean allUp =
                  checks.values().stream()
                      .allMatch(
                          value ->
                              value instanceof Map<?, ?> map
                                  && "UP".equals(String.valueOf(map.get("status"))));
              Map<String, Object> response = new LinkedHashMap<>();
              response.put("status", allUp ? "UP" : "DEGRADED");
              response.put("gateway", "UP");
              response.put("backends", checks);
              return response;
            });
  }
}
