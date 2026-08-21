package ar.edu.utn.dds.k3003;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class AdminCleanIntegrationTest {

  static MockWebServer dye;
  static MockWebServer donaciones;
  static MockWebServer logistica;
  static MockWebServer incentivos;

  @Autowired WebTestClient webTestClient;

  @BeforeAll
  static void startMockServers() throws Exception {
    dye = new MockWebServer();
    donaciones = new MockWebServer();
    logistica = new MockWebServer();
    incentivos = new MockWebServer();
    dye.start();
    donaciones.start();
    logistica.start();
    incentivos.start();
  }

  @AfterAll
  static void stopMockServers() throws Exception {
    dye.shutdown();
    donaciones.shutdown();
    logistica.shutdown();
    incentivos.shutdown();
  }

  @DynamicPropertySource
  static void overrideProperties(DynamicPropertyRegistry registry) {
    registry.add("gateway.dye-url", () -> dye.url("/").toString().replaceAll("/$", ""));
    registry.add(
        "gateway.donaciones-url", () -> donaciones.url("/").toString().replaceAll("/$", ""));
    registry.add(
        "gateway.logistica-url", () -> logistica.url("/").toString().replaceAll("/$", ""));
    registry.add(
        "gateway.incentivos-url", () -> incentivos.url("/").toString().replaceAll("/$", ""));
    registry.add("gateway.rate-limit.enabled", () -> "false");
    registry.add("gateway.admin-secret", () -> "s3cret");
    registry.add("gateway.admin-clean-timeout-sec", () -> "5");
  }

  @Test
  void clean_okCuandoTodosLosBackendsRespondenExito() throws InterruptedException {
    dye.enqueue(jsonOk("{\"deleted\":true}"));
    donaciones.enqueue(jsonOk("{\"deleted\":true}"));
    logistica.enqueue(jsonOk("{\"deleted\":true}"));
    incentivos.enqueue(jsonOk("{\"deleted\":true}"));

    webTestClient
        .delete()
        .uri("/admin/clean")
        .header(HttpHeaders.AUTHORIZATION, "Bearer s3cret")
        .exchange()
        .expectStatus()
        .isOk()
        .expectBody()
        .jsonPath("$.status")
        .isEqualTo("OK")
        .jsonPath("$.services.dye.outcome")
        .isEqualTo("OK")
        .jsonPath("$.services.donaciones.outcome")
        .isEqualTo("OK")
        .jsonPath("$.services.logistica.outcome")
        .isEqualTo("OK")
        .jsonPath("$.services.incentivos.outcome")
        .isEqualTo("OK");

    org.junit.jupiter.api.Assertions.assertEquals("/admin/db", takePath(dye));
    org.junit.jupiter.api.Assertions.assertEquals("/admin/db", takePath(donaciones));
    org.junit.jupiter.api.Assertions.assertEquals("/admin/db", takePath(logistica));
    org.junit.jupiter.api.Assertions.assertEquals("/admin/reset", takePath(incentivos));
  }

  @Test
  void clean_partialCuandoAlgunBackendFalla() {
    dye.enqueue(jsonOk("{}"));
    donaciones.enqueue(new MockResponse().setResponseCode(500).setBody("boom"));
    logistica.enqueue(jsonOk("{}"));
    incentivos.enqueue(jsonOk("{}"));

    webTestClient
        .delete()
        .uri("/admin/clean")
        .header(HttpHeaders.AUTHORIZATION, "Bearer s3cret")
        .exchange()
        .expectStatus()
        .isEqualTo(207)
        .expectBody()
        .jsonPath("$.status")
        .isEqualTo("PARTIAL")
        .jsonPath("$.services.donaciones.outcome")
        .isEqualTo("FAIL")
        .jsonPath("$.services.donaciones.httpStatus")
        .isEqualTo(500);
  }

  @Test
  void clean_unauthorizedSinBearer() {
    webTestClient.delete().uri("/admin/clean").exchange().expectStatus().isUnauthorized();
  }

  @Test
  void clean_unauthorizedConBearerInvalido() {
    webTestClient
        .delete()
        .uri("/admin/clean")
        .header(HttpHeaders.AUTHORIZATION, "Bearer nope")
        .exchange()
        .expectStatus()
        .isUnauthorized();
  }

  private static MockResponse jsonOk(String body) {
    return new MockResponse()
        .setResponseCode(200)
        .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
        .setBody(body);
  }

  private static String takePath(MockWebServer server) throws InterruptedException {
    RecordedRequest req = server.takeRequest();
    return req.getPath();
  }
}
