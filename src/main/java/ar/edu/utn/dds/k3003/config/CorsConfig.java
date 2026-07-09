package ar.edu.utn.dds.k3003.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {

  @Bean
  public CorsWebFilter corsWebFilter(GatewayProperties props) {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowCredentials(true);
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setExposedHeaders(List.of("X-Request-Id", "X-Gateway-Route"));

    String origins =
        props.cors() != null && props.cors().allowedOrigins() != null
            ? props.cors().allowedOrigins()
            : "*";
    if (origins == null || origins.isBlank() || "*".equals(origins.trim())) {
      config.addAllowedOriginPattern("*");
    } else {
      Arrays.stream(origins.split(","))
          .map(String::trim)
          .filter(s -> !s.isEmpty())
          .forEach(config::addAllowedOrigin);
    }

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return new CorsWebFilter(source);
  }
}
