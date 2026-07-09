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
                r.path("/dye/**")
                    .filters(f -> f.stripPrefix(1).addRequestHeader("X-Gateway-Route", "dye"))
                    .uri(props.dyeUrl()))
        .route(
            "donaciones",
            r ->
                r.path("/donaciones/**")
                    .filters(
                        f -> f.stripPrefix(1).addRequestHeader("X-Gateway-Route", "donaciones"))
                    .uri(props.donacionesUrl()))
        .route(
            "logistica",
            r ->
                r.path("/logistica/**")
                    .filters(
                        f -> f.stripPrefix(1).addRequestHeader("X-Gateway-Route", "logistica"))
                    .uri(props.logisticaUrl()))
        .route(
            "incentivos",
            r ->
                r.path("/incentivos/**")
                    .filters(
                        f -> f.stripPrefix(1).addRequestHeader("X-Gateway-Route", "incentivos"))
                    .uri(props.incentivosUrl()))
        .build();
  }
}
