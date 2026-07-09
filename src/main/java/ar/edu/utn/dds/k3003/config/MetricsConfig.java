package ar.edu.utn.dds.k3003.config;

import io.micrometer.core.instrument.Clock;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.jvm.JvmGcMetrics;
import io.micrometer.core.instrument.binder.jvm.JvmHeapPressureMetrics;
import io.micrometer.core.instrument.binder.jvm.JvmMemoryMetrics;
import io.micrometer.core.instrument.binder.system.FileDescriptorMetrics;
import io.micrometer.core.instrument.binder.system.ProcessorMetrics;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import io.micrometer.datadog.DatadogConfig;
import io.micrometer.datadog.DatadogMeterRegistry;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class MetricsConfig {

  private static final Logger log = LoggerFactory.getLogger(MetricsConfig.class);

  @Bean
  @Primary
  public MeterRegistry meterRegistry() {
    String apiKey = System.getenv("DDAPI");
    String env = resolveEnv();

    if (apiKey == null || apiKey.isBlank()) {
      log.info(
          "DDAPI no configurado — métricas en modo local (sin exportar a Datadog). env={}", env);
      return new SimpleMeterRegistry();
    }

    log.info("Datadog configurado — exportando métricas con tags app:api-gateway, env:{}", env);

    DatadogConfig config =
        new DatadogConfig() {
          @Override
          public Duration step() {
            return Duration.ofSeconds(10);
          }

          @Override
          public String apiKey() {
            return apiKey;
          }

          @Override
          public String uri() {
            return "https://api.datadoghq.com";
          }

          @Override
          public String get(String k) {
            return null;
          }
        };

    MeterRegistry registry = new DatadogMeterRegistry(config, Clock.SYSTEM);
    registry.config().commonTags("app", "api-gateway", "env", env);

    try (var jvmGcMetrics = new JvmGcMetrics();
        var jvmHeapPressureMetrics = new JvmHeapPressureMetrics()) {
      jvmGcMetrics.bindTo(registry);
      jvmHeapPressureMetrics.bindTo(registry);
    }
    new JvmMemoryMetrics().bindTo(registry);
    new ProcessorMetrics().bindTo(registry);
    new FileDescriptorMetrics().bindTo(registry);

    return registry;
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
}
