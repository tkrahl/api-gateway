package ar.edu.utn.dds.k3003.config;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.classic.spi.ThrowableProxyUtil;
import ch.qos.logback.core.UnsynchronizedAppenderBase;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Envía logs a Datadog Logs Intake (HTTP) cuando {@code DDAPI} está seteada. Sin key (local/tests)
 * el appender arranca como no-op.
 */
public class DatadogHttpAppender extends UnsynchronizedAppenderBase<ILoggingEvent> {

  static final String DEFAULT_INTAKE_URL = "https://http-intake.logs.datadoghq.com/api/v2/logs";
  private static final int MAX_MESSAGE_CHARS = 8192;

  private final ObjectMapper objectMapper = new ObjectMapper();
  private String apiKey;
  private String service = "app";
  private String env;
  private String intakeUrl = DEFAULT_INTAKE_URL;
  private String hostname = "unknown";
  private HttpClient httpClient;
  private boolean waitForSend;

  public void setApiKey(String apiKey) {
    this.apiKey = apiKey;
  }

  public void setService(String service) {
    this.service = service;
  }

  public void setEnv(String env) {
    this.env = env;
  }

  public void setIntakeUrl(String intakeUrl) {
    this.intakeUrl = intakeUrl;
  }

  public void setWaitForSend(boolean waitForSend) {
    this.waitForSend = waitForSend;
  }

  @Override
  public void start() {
    if (apiKey == null) {
      apiKey = System.getenv("DDAPI");
    }
    if (env == null || env.isBlank()) {
      env = resolveEnv();
    }
    hostname = resolveHostname();
    if (apiKey == null || apiKey.isBlank()) {
      addInfo("DDAPI no configurado — logs no se exportan a Datadog");
      super.start();
      return;
    }
    httpClient =
        HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    addInfo("Datadog logs habilitados — service=" + service + " env=" + env);
    super.start();
  }

  @Override
  protected void append(ILoggingEvent event) {
    if (httpClient == null || event == null) {
      return;
    }
    try {
      byte[] body = objectMapper.writeValueAsBytes(List.of(toPayload(event)));
      HttpRequest request =
          HttpRequest.newBuilder(URI.create(intakeUrl))
              .timeout(Duration.ofSeconds(5))
              .header("DD-API-KEY", apiKey)
              .header("Content-Type", "application/json")
              .POST(HttpRequest.BodyPublishers.ofByteArray(body))
              .build();
      var future = httpClient.sendAsync(request, HttpResponse.BodyHandlers.discarding());
      if (waitForSend) {
        future.get(5, TimeUnit.SECONDS);
      }
    } catch (Exception exception) {
      addError("No se pudo enviar log a Datadog", exception);
    }
  }

  Map<String, Object> toPayload(ILoggingEvent event) {
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("ddsource", "java");
    payload.put("service", service);
    payload.put("hostname", hostname);
    payload.put("ddtags", "env:" + env + ",app:" + service);
    payload.put("message", truncate(event.getFormattedMessage()));
    payload.put(
        "status", event.getLevel() != null ? event.getLevel().toString().toLowerCase() : "info");
    payload.put("logger.name", event.getLoggerName());
    payload.put("logger.thread_name", event.getThreadName());
    Map<String, String> mdc = event.getMDCPropertyMap();
    if (mdc != null) {
      String requestId = mdc.get("requestId");
      if (requestId != null && !requestId.isBlank()) {
        payload.put("requestId", requestId);
      }
    }
    IThrowableProxy throwable = event.getThrowableProxy();
    if (throwable != null) {
      payload.put("error.kind", throwable.getClassName());
      payload.put("error.message", throwable.getMessage());
      payload.put("error.stack", ThrowableProxyUtil.asString(throwable));
    }
    return payload;
  }

  private String truncate(String message) {
    if (message == null) {
      return "";
    }
    if (message.length() <= MAX_MESSAGE_CHARS) {
      return message;
    }
    return message.substring(0, MAX_MESSAGE_CHARS) + "...(truncated)";
  }

  private static String resolveEnv() {
    String explicit = System.getenv("APP_ENV");
    if (explicit != null && !explicit.isBlank()) {
      return explicit;
    }
    String render = System.getenv("RENDER");
    if (render != null && !render.isBlank()) {
      return "produccion";
    }
    return "local";
  }

  private static String resolveHostname() {
    try {
      return InetAddress.getLocalHost().getHostName();
    } catch (Exception exception) {
      return "unknown";
    }
  }

  boolean isShippingEnabled() {
    return httpClient != null;
  }
}

