package ar.edu.utn.dds.k3003.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayRoutesConfig {

  @Bean
  public RouteLocator gatewayRoutes(RouteLocatorBuilder builder, GatewayProperties props) {
    return builder
        .routes()
        .route(
            "dye",
            r ->
                r.path("/api/dye/**")
                    .filters(f -> f.stripPrefix(2).addRequestHeader("X-Gateway-Route", "dye"))
                    .uri(props.dyeUrl()))
        .route(
            "donaciones",
            r ->
                r.path("/api/donaciones/**")
                    .filters(
                        f -> f.stripPrefix(2).addRequestHeader("X-Gateway-Route", "donaciones"))
                    .uri(props.donacionesUrl()))
        .route(
            "logistica",
            r ->
                r.path("/api/logistica/**")
                    .filters(
                        f -> f.stripPrefix(2).addRequestHeader("X-Gateway-Route", "logistica"))
                    .uri(props.logisticaUrl()))
        .route(
            "incentivos",
            r ->
                r.path("/api/incentivos/**")
                    .filters(
                        f -> f.stripPrefix(2).addRequestHeader("X-Gateway-Route", "incentivos"))
                    .uri(props.incentivosUrl()))
        .build();
  }
}
