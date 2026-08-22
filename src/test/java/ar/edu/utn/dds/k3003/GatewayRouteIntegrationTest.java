package ar.edu.utn.dds.k3003;

import ar.edu.utn.dds.k3003.filters.RequestLoggingFilter;
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
class GatewayRouteIntegrationTest {

  static MockWebServer dyeBackend;

  @Autowired WebTestClient webTestClient;

  @BeforeAll
  static void startMockServer() throws Exception {
    dyeBackend = new MockWebServer();
    dyeBackend.start();
  }

  @AfterAll
  static void stopMockServer() throws Exception {
    dyeBackend.shutdown();
  }

  @DynamicPropertySource
  static void overrideGatewayUrls(DynamicPropertyRegistry registry) {
    String base = dyeBackend.url("/").toString();
    registry.add("gateway.dye-url", () -> base);
    registry.add("gateway.donaciones-url", () -> base);
    registry.add("gateway.logistica-url", () -> base);
    registry.add("gateway.incentivos-url", () -> base);
    registry.add("gateway.rate-limit.enabled", () -> "false");
  }

  @Test
  void proxy_dye_stripPrefix() throws InterruptedException {
    dyeBackend.enqueue(
        new MockResponse()
            .setResponseCode(200)
            .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .setBody("{\"ok\":true}"));

    webTestClient
        .get()
        .uri("/api/dye/actuator/health")
        .exchange()
        .expectStatus()
        .isOk()
        .expectBody()
        .jsonPath("$.ok")
        .isEqualTo(true);

    var recorded = dyeBackend.takeRequest();
    org.junit.jupiter.api.Assertions.assertEquals("/actuator/health", recorded.getPath());
    org.junit.jupiter.api.Assertions.assertEquals("dye", recorded.getHeader("X-Gateway-Route"));
    String generatedRequestId = recorded.getHeader(RequestLoggingFilter.REQUEST_ID_HEADER);
    org.junit.jupiter.api.Assertions.assertNotNull(generatedRequestId);
    java.util.UUID.fromString(generatedRequestId);
  }

  @Test
  void proxy_propagaXRequestIdAlBackend() throws InterruptedException {
    dyeBackend.enqueue(
        new MockResponse()
            .setResponseCode(200)
            .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .setBody("{\"ok\":true}"));

    String requestId = "11111111-2222-3333-4444-555555555555";
    webTestClient
        .get()
        .uri("/api/dye/actuator/health")
        .header(RequestLoggingFilter.REQUEST_ID_HEADER, requestId)
        .exchange()
        .expectStatus()
        .isOk()
        .expectHeader()
        .valueEquals(RequestLoggingFilter.REQUEST_ID_HEADER, requestId);

    var recorded = dyeBackend.takeRequest();
    org.junit.jupiter.api.Assertions.assertEquals(
        requestId, recorded.getHeader(RequestLoggingFilter.REQUEST_ID_HEADER));
  }

  @Test
  void health_gatewayExponeInfo() {
    webTestClient
        .get()
        .uri("/")
        .exchange()
        .expectStatus()
        .isOk()
        .expectBody()
        .jsonPath("$.service")
        .isEqualTo("donatrack-api-gateway")
        .jsonPath("$.routes.dye.prefix")
        .isEqualTo("/api/dye");
  }
}
