package ar.edu.utn.dds.k3003.controllers;

import ar.edu.utn.dds.k3003.config.GatewayProperties;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * Endpoint utilitario para limpiar los 4 backends de una sola llamada. Fan-out paralelo a cada
 * {@code DELETE /admin/db} (o {@code /admin/reset} en Incentivos).
 *
 * <p>Auth opcional via {@code Authorization: Bearer <ADMIN_SECRET>}. Si {@code gateway.admin-secret}
 * esta vacio, el endpoint queda abierto (util para desarrollo local); en Render se recomienda
 * setear la variable.
 */
@RestController
@RequestMapping("/admin")
public class AdminCleanController {

  private static final Logger LOG = LoggerFactory.getLogger(AdminCleanController.class);

  private final GatewayProperties properties;
  private final WebClient webClient;
  private final MeterRegistry registry;

  public AdminCleanController(
      GatewayProperties properties, WebClient.Builder webClientBuilder, MeterRegistry registry) {
    this.properties = properties;
    this.webClient = webClientBuilder.build();
    this.registry = registry;
  }

  @DeleteMapping(value = "/clean", produces = MediaType.APPLICATION_JSON_VALUE)
  public Mono<ResponseEntity<Map<String, Object>>> clean(
      @RequestHeader(value = "Authorization", required = false) String authorization) {

    if (!authorized(authorization)) {
      registry.counter("gateway.admin.clean", "resultado", "unauthorized").increment();
      Map<String, Object> body =
          Map.of("status", "UNAUTHORIZED", "error", "Bearer token requerido o invalido");
      return Mono.just(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body));
    }

    List<Target> targets =
        List.of(
            new Target("dye", properties.dyeUrl() + "/admin/db"),
            new Target("donaciones", properties.donacionesUrl() + "/admin/db"),
            new Target("logistica", properties.logisticaUrl() + "/admin/db"),
            new Target("incentivos", properties.incentivosUrl() + "/admin/reset"));

    Duration timeout = Duration.ofSeconds(properties.adminCleanTimeoutSec());

    return Flux.fromIterable(targets)
        .flatMap(
            target ->
                webClient
                    .delete()
                    .uri(target.url())
                    .exchangeToMono(
                        response ->
                            response
                                .bodyToMono(String.class)
                                .defaultIfEmpty("")
                                .map(
                                    body ->
                                        entry(
                                            target,
                                            response.statusCode().value(),
                                            response.statusCode().is2xxSuccessful()
                                                ? "OK"
                                                : "FAIL",
                                            body,
                                            null)))
                    .timeout(timeout)
                    .onErrorResume(
                        error -> {
                          LOG.warn(
                              "admin/clean: fallo {} → {}: {}",
                              target.name(),
                              target.url(),
                              error.toString());
                          return Mono.just(entry(target, 0, "ERROR", null, error.toString()));
                        }))
        .collectList()
        .map(
            list -> {
              Map<String, Object> results = new LinkedHashMap<>();
              for (Map<String, Object> row : list) {
                String name = String.valueOf(row.get("name"));
                Map<String, Object> detail = new LinkedHashMap<>(row);
                detail.remove("name");
                results.put(name, detail);
              }
              boolean allOk = list.stream().allMatch(r -> "OK".equals(r.get("outcome")));
              registry
                  .counter("gateway.admin.clean", "resultado", allOk ? "ok" : "partial")
                  .increment();
              Map<String, Object> response = new LinkedHashMap<>();
              response.put("status", allOk ? "OK" : "PARTIAL");
              response.put("services", results);
              HttpStatus statusCode = allOk ? HttpStatus.OK : HttpStatus.MULTI_STATUS;
              LOG.info(
                  "admin/clean terminado — status={} services={}", response.get("status"), results);
              return ResponseEntity.status(statusCode).body(response);
            });
  }

  private boolean authorized(String authorizationHeader) {
    String expected = properties.adminSecret();
    if (expected == null || expected.isBlank()) {
      LOG.warn("admin/clean sin ADMIN_SECRET configurado — endpoint abierto");
      return true;
    }
    if (authorizationHeader == null) {
      return false;
    }
    String prefix = "Bearer ";
    if (!authorizationHeader.regionMatches(true, 0, prefix, 0, prefix.length())) {
      return false;
    }
    String token = authorizationHeader.substring(prefix.length()).trim();
    return expected.equals(token);
  }

  private static Map<String, Object> entry(
      Target target, int status, String outcome, String body, String error) {
    Map<String, Object> map = new LinkedHashMap<>();
    map.put("name", target.name());
    map.put("url", target.url());
    map.put("httpStatus", status);
    map.put("outcome", outcome);
    if (body != null && !body.isBlank()) {
      map.put("body", body.length() > 400 ? body.substring(0, 400) + "…" : body);
    }
    if (error != null) {
      map.put("error", error);
    }
    return map;
  }

  private record Target(String name, String url) {}
}
