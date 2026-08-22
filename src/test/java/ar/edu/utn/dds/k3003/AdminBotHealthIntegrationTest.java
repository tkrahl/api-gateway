package ar.edu.utn.dds.k3003;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
class AdminBotHealthIntegrationTest {

  static MockWebServer bot;

  @Autowired WebTestClient webTestClient;

  @BeforeAll
  static void startMockServer() throws Exception {
    bot = new MockWebServer();
    bot.start();
  }

  @AfterAll
  static void stopMockServer() throws Exception {
    bot.shutdown();
  }

  @DynamicPropertySource
  static void overrideProperties(DynamicPropertyRegistry registry) {
    registry.add("gateway.telegram-bot-url", () -> bot.url("/").toString().replaceAll("/$", ""));
    registry.add("gateway.rate-limit.enabled", () -> "false");
    registry.add("gateway.health-backend-timeout-sec", () -> "3");
  }

  @Test
  void botHealth_upYCooldownTras429() throws InterruptedException {
    bot.enqueue(json(200, "{\"status\":\"UP\"}"));

    webTestClient
        .get()
        .uri("/admin/bot-health")
        .exchange()
        .expectStatus()
        .isOk()
        .expectBody()
        .jsonPath("$.status")
        .isEqualTo("UP");

    assertEquals("/health", bot.takeRequest().getPath());

    int before429 = bot.getRequestCount();
    bot.enqueue(new MockResponse().setResponseCode(429).setBody("Too Many Requests"));

    webTestClient
        .get()
        .uri("/admin/bot-health")
        .exchange()
        .expectStatus()
        .isOk()
        .expectBody()
        .jsonPath("$.status")
        .isEqualTo("WARMING")
        .jsonPath("$.httpStatus")
        .isEqualTo(429);

    webTestClient
        .get()
        .uri("/admin/bot-health")
        .exchange()
        .expectStatus()
        .isOk()
        .expectBody()
        .jsonPath("$.status")
        .isEqualTo("WARMING")
        .jsonPath("$.cached")
        .isEqualTo(true);

    assertEquals(before429 + 1, bot.getRequestCount());
    assertEquals("/health", bot.takeRequest().getPath());
  }

  private static MockResponse json(int code, String body) {
    return new MockResponse()
        .setResponseCode(code)
        .setHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
        .setBody(body);
  }
}
