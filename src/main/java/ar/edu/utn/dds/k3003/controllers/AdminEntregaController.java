package ar.edu.utn.dds.k3003.controllers;

import ar.edu.utn.dds.k3003.config.GatewayProperties;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Sirve el dashboard operativo con auth por cookie de sesión. Flujo:
 *
 * <pre>
 *   GET  /admin              → si no hay cookie válida, 303 → /admin/login
 *                            → con cookie válida, sirve dashboard.html
 *   GET  /admin/modules/{id} → explorador de recursos (dye|donaciones|logistica|incentivos)
 *   GET  /admin/login        → página de login (form)
 *   POST /admin/login        → valida password contra ADMIN_SECRET, setea cookie httpOnly
 *   POST /admin/logout       → borra la cookie
 * </pre>
 *
 * <p>Sin {@code ADMIN_SECRET} configurado, el dashboard queda abierto (dev).
 */
@RestController
@RequestMapping("/admin")
public class AdminEntregaController {

  private static final Logger LOG = LoggerFactory.getLogger(AdminEntregaController.class);

  private static final String COOKIE_NAME = "donatrack_session";
  private static final String DASHBOARD_RESOURCE = "protected/dashboard.html";
  private static final String MODULE_RESOURCE = "protected/module.html";
  private static final String LOGIN_RESOURCE = "protected/login.html";
  private static final String COOKIE_PATH = "/admin";
  private static final Set<String> MODULE_IDS =
      Set.of("dye", "donaciones", "logistica", "incentivos");

  private final GatewayProperties properties;

  public AdminEntregaController(GatewayProperties properties) {
    this.properties = properties;
  }

  @GetMapping
  public ResponseEntity<byte[]> dashboard(
      @CookieValue(name = COOKIE_NAME, required = false) String session) throws IOException {
    if (!isAuthenticated(session)) {
      return redirect(COOKIE_PATH + "/login");
    }
    return htmlResponse(readClasspathResource(DASHBOARD_RESOURCE), true, null);
  }

  @GetMapping("/modules/{moduleId}")
  public ResponseEntity<byte[]> modulePage(
      @PathVariable("moduleId") String moduleId,
      @CookieValue(name = COOKIE_NAME, required = false) String session)
      throws IOException {
    if (!isAuthenticated(session)) {
      return redirect(COOKIE_PATH + "/login");
    }
    String id = moduleId == null ? "" : moduleId.trim().toLowerCase();
    if (!MODULE_IDS.contains(id)) {
      return redirect(COOKIE_PATH);
    }
    String html = new String(readClasspathResource(MODULE_RESOURCE), StandardCharsets.UTF_8);
    html = html.replace("{{MODULE_ID}}", id);
    return htmlResponse(html.getBytes(StandardCharsets.UTF_8), true, null);
  }

  @GetMapping("/login")
  public ResponseEntity<byte[]> loginPage(
      @CookieValue(name = COOKIE_NAME, required = false) String session,
      @RequestParam(name = "error", required = false) String error)
      throws IOException {
    if (isAuthenticated(session)) {
      return redirect(COOKIE_PATH);
    }
    String html = new String(readClasspathResource(LOGIN_RESOURCE), StandardCharsets.UTF_8);
    html = html.replace("{{ERROR_ATTR}}", error == null ? "hidden" : "");
    return htmlResponse(html.getBytes(StandardCharsets.UTF_8), true, null);
  }

  @PostMapping(value = "/login", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
  public Mono<ResponseEntity<byte[]>> login(ServerWebExchange exchange) {
    return exchange
        .getFormData()
        .map(
            form -> {
              String password = form.getFirst("password");
              if (!passwordMatches(password)) {
                LOG.info("admin/entrega login fallido");
                return redirect(COOKIE_PATH + "/login?error=1");
              }
              LOG.info("admin/entrega login exitoso");
              return redirect(COOKIE_PATH, sessionCookie(password, /* maxAgeSeconds */ -1));
            });
  }

  @PostMapping("/logout")
  public ResponseEntity<byte[]> logout() {
    return redirect(COOKIE_PATH + "/login", sessionCookie("", 0));
  }

  // ---------- helpers ----------

  private boolean isAuthenticated(String session) {
    String expected = properties.adminSecret();
    if (expected == null || expected.isBlank()) {
      // Sin secret configurado, el dashboard queda abierto (dev). Loguear solo una vez sería ideal;
      // por simplicidad lo logueamos a nivel debug.
      return true;
    }
    return session != null && expected.equals(session);
  }

  private boolean passwordMatches(String password) {
    String expected = properties.adminSecret();
    if (expected == null || expected.isBlank()) {
      // Sin secret configurado, cualquier password entra (dev).
      return true;
    }
    return password != null && expected.equals(password);
  }

  private ResponseCookie sessionCookie(String value, long maxAgeSeconds) {
    ResponseCookie.ResponseCookieBuilder builder =
        ResponseCookie.from(COOKIE_NAME, value)
            .httpOnly(true)
            .path(COOKIE_PATH)
            .sameSite("Strict")
            .secure(false); // TODO: en Render (HTTPS) conviene true; se puede parametrizar
    if (maxAgeSeconds >= 0) {
      builder.maxAge(maxAgeSeconds);
    }
    return builder.build();
  }

  private ResponseEntity<byte[]> redirect(String location) {
    return redirect(location, null);
  }

  private ResponseEntity<byte[]> redirect(String location, ResponseCookie cookie) {
    HttpHeaders headers = new HttpHeaders();
    headers.setLocation(URI.create(location));
    if (cookie != null) {
      headers.add(HttpHeaders.SET_COOKIE, cookie.toString());
    }
    return new ResponseEntity<>(new byte[0], headers, HttpStatus.SEE_OTHER);
  }

  private ResponseEntity<byte[]> htmlResponse(byte[] body, boolean noStore, ResponseCookie cookie) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.valueOf("text/html; charset=UTF-8"));
    if (noStore) {
      headers.setCacheControl("no-store, no-cache, must-revalidate");
      headers.add("Pragma", "no-cache");
    }
    if (cookie != null) {
      headers.add(HttpHeaders.SET_COOKIE, cookie.toString());
    }
    return new ResponseEntity<>(body, headers, HttpStatus.OK);
  }

  private byte[] readClasspathResource(String path) throws IOException {
    ClassPathResource resource = new ClassPathResource(path);
    try (var in = resource.getInputStream()) {
      return in.readAllBytes();
    }
  }

  // Solo para tests (utility)
  static List<String> readCookies(HttpHeaders headers) {
    return headers.getOrDefault(HttpHeaders.SET_COOKIE, List.of());
  }
}
