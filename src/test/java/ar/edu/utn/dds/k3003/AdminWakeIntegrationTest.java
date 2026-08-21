package ar.edu.utn.dds.k3003;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
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
class AdminWakeIntegrationTest {

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
    registry.add("gateway.health-backend-timeout-sec", () -> "3");
  }

  @Test
  void wakeAll_okCuandoTodosResponden() {
    dye.enqueue(jsonOk("{\"status\":\"UP\"}"));
    donaciones.enqueue(jsonOk("{\"status\":\"UP\"}"));
    logistica.enqueue(jsonOk("{\"status\":\"UP\"}"));
    incentivos.enqueue(jsonOk("{\"status\":\"UP\"}"));

    webTestClient
        .post()
        .uri("/admin/wake")
        .exchange()
        .expectStatus()
        .isOk()
        .expectBody()
        .jsonPath("$.status")
        .isEqualTo("OK")
        .jsonPath("$.services.dye.outcome")
        .isEqualTo("AWAKE")
        .jsonPath("$.services.incentivos.outcome")
        .isEqualTo("AWAKE");
  }

  @Test
  void wakeAll_partialCuandoAlgunoFalla() {
    dye.enqueue(jsonOk("{\"status\":\"UP\"}"));
    donaciones.enqueue(new MockResponse().setResponseCode(503).setBody("no"));
    logistica.enqueue(jsonOk("{\"status\":\"UP\"}"));
    incentivos.enqueue(jsonOk("{\"status\":\"UP\"}"));

    webTestClient
        .post()
        .uri("/admin/wake")
        .exchange()
        .expectStatus()
        .isEqualTo(207)
        .expectBody()
        .jsonPath("$.status")
        .isEqualTo("PARTIAL")
        .jsonPath("$.services.donaciones.outcome")
        .isEqualTo("FAILED")
        .jsonPath("$.services.donaciones.httpStatus")
        .isEqualTo(503);
  }

  @Test
  void wakeOne_devuelveServicioSolo() {
    dye.enqueue(jsonOk("{\"status\":\"UP\"}"));

    webTestClient
        .post()
        .uri("/admin/wake/dye")
        .exchange()
        .expectStatus()
        .isOk()
        .expectBody()
        .jsonPath("$.status")
        .isEqualTo("OK")
        .jsonPath("$.service.outcome")
        .isEqualTo("AWAKE");
  }

  @Test
  void wakeOne_notFoundParaNombreDesconocido() {
    webTestClient.post().uri("/admin/wake/desconocido").exchange().expectStatus().isNotFound();
  }

  private static MockResponse jsonOk(String body) {
    return new MockResponse()
        .setResponseCode(200)
        .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
        .setBody(body);
  }
}
