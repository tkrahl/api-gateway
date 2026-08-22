package ar.edu.utn.dds.k3003;

import java.net.URI;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class AdminEntregaIntegrationTest {

  static final String SECRET = "s3cret";

  @Autowired WebTestClient webTestClient;

  @DynamicPropertySource
  static void overrideProperties(DynamicPropertyRegistry registry) {
    registry.add("gateway.rate-limit.enabled", () -> "false");
    registry.add("gateway.admin-secret", () -> SECRET);
  }

  @Test
  void entrega_sinCookieRedirigeALogin() {
    webTestClient
        .get()
        .uri("/admin")
        .exchange()
        .expectStatus()
        .isSeeOther()
        .expectHeader()
        .value(HttpHeaders.LOCATION, loc -> {
          if (!"/admin/login".equals(loc)) {
            throw new AssertionError("Se esperaba /admin/login, vino: " + loc);
          }
        });
  }

  @Test
  void loginPage_devuelveHtml() {
    webTestClient
        .get()
        .uri("/admin/login")
        .exchange()
        .expectStatus()
        .isOk()
        .expectHeader()
        .contentTypeCompatibleWith("text/html")
        .expectBody(String.class)
        .value(html -> {
          if (!html.contains("Ingresar") || !html.contains("password")) {
            throw new AssertionError("La página de login no tiene form esperado. Body: "
                + html.substring(0, Math.min(300, html.length())));
          }
        });
  }

  @Test
  void loginPage_conErrorMuestraMensaje() {
    webTestClient
        .get()
        .uri("/admin/login?error=1")
        .exchange()
        .expectStatus()
        .isOk()
        .expectBody(String.class)
        .value(html -> {
          // sin hidden en el div .error
          if (html.contains("class=\"error\" id=\"errorMsg\" hidden")) {
            throw new AssertionError("El error debería estar visible, sigue con hidden");
          }
        });
  }

  @Test
  void login_conPasswordCorrectaSeteaCookieYRedirige() {
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("password", SECRET);

    webTestClient
        .post()
        .uri("/admin/login")
        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
        .body(BodyInserters.fromFormData(form))
        .exchange()
        .expectStatus()
        .isSeeOther()
        .expectHeader()
        .location("/admin")
        .expectHeader()
        .value(HttpHeaders.SET_COOKIE, cookie -> {
          if (cookie == null || !cookie.contains("donatrack_session=")) {
            throw new AssertionError("Faltó cookie de sesión, vino: " + cookie);
          }
          if (!cookie.contains("HttpOnly")) {
            throw new AssertionError("La cookie debería ser HttpOnly, vino: " + cookie);
          }
          if (!cookie.contains("SameSite=Strict")) {
            throw new AssertionError("La cookie debería tener SameSite=Strict, vino: " + cookie);
          }
        });
  }

  @Test
  void login_conPasswordIncorrectaRedirigeAErrorSinCookie() {
    MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
    form.add("password", "wrong");

    webTestClient
        .post()
        .uri("/admin/login")
        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
        .body(BodyInserters.fromFormData(form))
        .exchange()
        .expectStatus()
        .isSeeOther()
        .expectHeader()
        .location("/admin/login?error=1")
        .expectBody()
        .consumeWith(result -> {
          var cookies = result.getResponseCookies().get("donatrack_session");
          if (cookies != null && !cookies.isEmpty()) {
            var value = cookies.get(0).getValue();
            if (value != null && !value.isBlank()) {
              throw new AssertionError("No debería setear cookie válida con password incorrecta, vino: " + value);
            }
          }
        });
  }

  @Test
  void entrega_conCookieValidaDevuelveDashboard() {
    webTestClient
        .get()
        .uri(URI.create("/admin"))
        .cookie("donatrack_session", SECRET)
        .exchange()
        .expectStatus()
        .isOk()
        .expectHeader()
        .contentTypeCompatibleWith("text/html")
        .expectBody(String.class)
        .value(html -> {
          if (!html.contains("DonaTrack") || !html.contains("Status")) {
            throw new AssertionError("El HTML no parece el dashboard. Body inicial: "
                + html.substring(0, Math.min(200, html.length())));
          }
        });
  }

  @Test
  void entrega_conCookieInvalidaRedirigeALogin() {
    webTestClient
        .get()
        .uri("/admin")
        .cookie("donatrack_session", "wrong-value")
        .exchange()
        .expectStatus()
        .isSeeOther()
        .expectHeader()
        .location("/admin/login");
  }

  @Test
  void logout_borraCookieYRedirigeALogin() {
    webTestClient
        .post()
        .uri("/admin/logout")
        .exchange()
        .expectStatus()
        .isSeeOther()
        .expectHeader()
        .location("/admin/login")
        .expectHeader()
        .value(HttpHeaders.SET_COOKIE, cookie -> {
          if (cookie == null || !cookie.contains("Max-Age=0")) {
            throw new AssertionError("Logout debería setear Max-Age=0 para expirar, vino: " + cookie);
          }
        });
  }

  @Test
  void dashboardHtml_directoNoAccesibleYaQueSeMovioAProtected() {
    webTestClient.get().uri("/dashboard.html").exchange().expectStatus().isNotFound();
  }

  @Test
  void module_gatewayOBotRedirigeAlDashboard() {
    webTestClient
        .get()
        .uri("/admin/modules/gateway")
        .cookie("donatrack_session", SECRET)
        .exchange()
        .expectStatus()
        .isSeeOther()
        .expectHeader()
        .location("/admin");

    webTestClient
        .get()
        .uri("/admin/modules/bot")
        .cookie("donatrack_session", SECRET)
        .exchange()
        .expectStatus()
        .isSeeOther()
        .expectHeader()
        .location("/admin");
  }

  @Test
  void module_conCookieValidaDevuelvePagina() {
    webTestClient
        .get()
        .uri("/admin/modules/dye")
        .cookie("donatrack_session", SECRET)
        .exchange()
        .expectStatus()
        .isOk()
        .expectHeader()
        .contentTypeCompatibleWith("text/html")
        .expectBody(String.class)
        .value(
            html -> {
              if (html.contains("{{MODULE_ID}}")) {
                throw new AssertionError("El placeholder {{MODULE_ID}} no fue reemplazado");
              }
              if (!html.contains("MODULE_ID = \"dye\"")) {
                throw new AssertionError("Se esperaba MODULE_ID = \"dye\"");
              }
            });
  }
}
