package ar.edu.utn.dds.k3003.filters;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class RequestLoggingFilterTest {

  @Test
  void resolveRoute_identificaModulos() {
    assertEquals("dye", RequestLoggingFilter.resolveRoute("/dye/donadores"));
    assertEquals("donaciones", RequestLoggingFilter.resolveRoute("/donaciones/productos/1"));
    assertEquals("logistica", RequestLoggingFilter.resolveRoute("/logistica/depositos"));
    assertEquals("incentivos", RequestLoggingFilter.resolveRoute("/incentivos/mision"));
    assertEquals("gateway", RequestLoggingFilter.resolveRoute("/health"));
    assertEquals("unknown", RequestLoggingFilter.resolveRoute("/otro"));
  }
}
