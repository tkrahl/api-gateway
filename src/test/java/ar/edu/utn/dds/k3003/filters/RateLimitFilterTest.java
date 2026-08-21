package ar.edu.utn.dds.k3003.filters;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;

class RateLimitFilterTest {

  @Test
  void windowCounter_agotaTokensAlSuperarLimite() {
    var counter = new RateLimitFilter.WindowCounter(3);
    assertTrue(counter.tryAcquire());
    assertTrue(counter.tryAcquire());
    assertTrue(counter.tryAcquire());
    assertFalse(counter.tryAcquire());
  }

  @Test
  void resolveClientKey_usaXForwardedFor() {
    var exchange =
        MockServerWebExchange.from(
            MockServerHttpRequest.get("/api/dye/donadores")
                .header("X-Forwarded-For", "201.1.2.3, 10.0.0.1"));
    assertEquals("201.1.2.3", RateLimitFilter.resolveClientKey(exchange));
  }
}
