package ar.edu.utn.dds.k3003.controllers;

import ar.edu.utn.dds.k3003.config.GatewayProperties;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * Endpoint utilitario para "despertar" backends dormidos (cold start en Render free tier). Hace
 * {@code GET /actuator/health} contra el backend, con timeout largo, y devuelve latencia + status.
 *
 * <p>NO tiene auth: es una operación no destructiva (solo GET) y se llama desde el dashboard sin
 * poder guardar tokens.
 */
@RestController
@RequestMapping("/admin/wake")
public class AdminWakeController {

  private static final Logger LOG = LoggerFactory.getLogger(AdminWakeController.class);

  private final GatewayProperties properties;
  private final WebClient webClient;

  public AdminWakeController(GatewayProperties properties, WebClient.Builder webClientBuilder) {
    this.properties = properties;
    this.webClient = webClientBuilder.build();
  }

  @PostMapping(produces = MediaType.APPLICATION_JSON_VALUE)
  public Mono<ResponseEntity<Map<String, Object>>> wakeAll() {
    Duration timeout = wakeTimeout();
    return Flux.fromIterable(allTargets())
        .flatMap(target -> ping(target, timeout))
        .collectList()
        .map(
            list -> {
              Map<String, Object> results = new LinkedHashMap<>();
              for (Map<String, Object> row : list) {
                results.put(String.valueOf(row.get("name")), stripName(row));
              }
              boolean allAwake = list.stream().allMatch(r -> "AWAKE".equals(r.get("outcome")));
              Map<String, Object> response = new LinkedHashMap<>();
              response.put("status", allAwake ? "OK" : "PARTIAL");
              response.put("services", results);
              return ResponseEntity.status(allAwake ? HttpStatus.OK : HttpStatus.MULTI_STATUS)
                  .body(response);
            });
  }

  @PostMapping(value = "/{service}", produces = MediaType.APPLICATION_JSON_VALUE)
  public Mono<ResponseEntity<Map<String, Object>>> wakeOne(@PathVariable("service") String service) {
    Target target = targetFor(service);
    if (target == null) {
      Map<String, Object> body = Map.of("status", "NOT_FOUND", "error", "servicio desconocido: " + service);
      return Mono.just(ResponseEntity.status(HttpStatus.NOT_FOUND).body(body));
    }
    Duration timeout = wakeTimeout();
    return ping(target, timeout)
        .map(
            row -> {
              boolean awake = "AWAKE".equals(row.get("outcome"));
              Map<String, Object> response = new LinkedHashMap<>();
              response.put("status", awake ? "OK" : "FAIL");
              response.put("service", stripName(row));
              return ResponseEntity.status(awake ? HttpStatus.OK : HttpStatus.BAD_GATEWAY)
                  .body(response);
            });
  }

  private Mono<Map<String, Object>> ping(Target target, Duration timeout) {
    long start = System.currentTimeMillis();
    return webClient
        .get()
        .uri(target.url())
        .exchangeToMono(
            response ->
                response
                    .releaseBody()
                    .thenReturn(
                        entry(
                            target,
                            response.statusCode().value(),
                            response.statusCode().is2xxSuccessful() ? "AWAKE" : "FAILED",
                            System.currentTimeMillis() - start,
                            null)))
        .timeout(timeout)
        .onErrorResume(
            error -> {
              long ms = System.currentTimeMillis() - start;
              LOG.warn(
                  "admin/wake: fallo {} → {} tras {}ms: {}",
                  target.name(),
                  target.url(),
                  ms,
                  error.toString());
              return Mono.just(entry(target, 0, "FAILED", ms, error.toString()));
            });
  }

  private Duration wakeTimeout() {
    return Duration.ofSeconds(Math.max(properties.healthBackendTimeoutSec() * 2L, 60L));
  }

  private List<Target> allTargets() {
    return List.of(
        new Target("dye", properties.dyeUrl() + "/actuator/health"),
        new Target("donaciones", properties.donacionesUrl() + "/actuator/health"),
        new Target("logistica", properties.logisticaUrl() + "/actuator/health"),
        new Target("incentivos", properties.incentivosUrl() + "/actuator/health"));
  }

  private Target targetFor(String name) {
    return switch (name == null ? "" : name.toLowerCase()) {
      case "dye" -> new Target("dye", properties.dyeUrl() + "/actuator/health");
      case "donaciones" -> new Target("donaciones", properties.donacionesUrl() + "/actuator/health");
      case "logistica" -> new Target("logistica", properties.logisticaUrl() + "/actuator/health");
      case "incentivos" -> new Target("incentivos", properties.incentivosUrl() + "/actuator/health");
      default -> null;
    };
  }

  private static Map<String, Object> entry(
      Target target, int status, String outcome, long latencyMs, String error) {
    Map<String, Object> map = new LinkedHashMap<>();
    map.put("name", target.name());
    map.put("url", target.url());
    map.put("httpStatus", status);
    map.put("outcome", outcome);
    map.put("latencyMs", latencyMs);
    if (error != null) {
      map.put("error", error);
    }
    return map;
  }

  private static Map<String, Object> stripName(Map<String, Object> row) {
    Map<String, Object> copy = new LinkedHashMap<>(row);
    copy.remove("name");
    return copy;
  }

  private record Target(String name, String url) {}
}
