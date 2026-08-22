package ar.edu.utn.dds.k3003.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.LoggingEvent;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DatadogHttpAppenderTest {

  @Test
  void payloadIncluyeRequestIdYMensaje() {
    DatadogHttpAppender appender = new DatadogHttpAppender();
    appender.setService("dye");
    appender.setEnv("test");
    appender.start();

    LoggingEvent event = sampleEvent("Incoming request requestId=abc method=GET");
    event.setMDCPropertyMap(Map.of("requestId", "abc"));

    Map<String, Object> payload = appender.toPayload(event);
    assertEquals("dye", payload.get("service"));
    assertEquals("abc", payload.get("requestId"));
    assertEquals("info", payload.get("status"));
    assertTrue(payload.get("message").toString().contains("Incoming request"));
    assertEquals("env:test,app:dye", payload.get("ddtags"));
  }

  @Test
  void sinApiKeyNoHabilitaEnvio() {
    DatadogHttpAppender appender = new DatadogHttpAppender();
    appender.setApiKey("");
    appender.start();
    assertFalse(appender.isShippingEnabled());
  }

  @Test
  void conApiKeyHabilitaEnvio() {
    DatadogHttpAppender appender = new DatadogHttpAppender();
    appender.setApiKey("test-key");
    appender.start();
    assertTrue(appender.isShippingEnabled());
  }

  private LoggingEvent sampleEvent(String message) {
    LoggingEvent event = new LoggingEvent();
    event.setLoggerContext(new LoggerContext());
    event.setLoggerName("test.logger");
    event.setLevel(Level.INFO);
    event.setMessage(message);
    event.setThreadName("test");
    event.setTimeStamp(System.currentTimeMillis());
    return event;
  }
}
