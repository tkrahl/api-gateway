package ar.edu.utn.dds.k3003.filters;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class RateLimitFilterTest {

  @Test
  void windowCounter_agotaTokensAlSuperarLimite() {
    var counter = new RateLimitFilter.WindowCounter(3);
    assertTrue(counter.tryAcquire());
    assertTrue(counter.tryAcquire());
    assertTrue(counter.tryAcquire());
    assertFalse(counter.tryAcquire());
  }
}
