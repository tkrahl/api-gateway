package ar.edu.utn.dds.k3003.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "gateway")
public class GatewayProperties {

  private String dyeUrl = "https://donadores-entidades.onrender.com";
  private String donacionesUrl = "https://donaciones-dgs7.onrender.com";
  private String logisticaUrl = "https://logisticaweb.onrender.com";
  private String incentivosUrl = "https://incentivos-movn.onrender.com";
  private String telegramBotUrl = "https://telegram-bot-z236.onrender.com";
  private RateLimit rateLimit = new RateLimit();
  private Cors cors = new Cors();
  private int healthBackendTimeoutSec = 45;
  private String adminSecret = "";
  private int adminCleanTimeoutSec = 60;

  public String dyeUrl() {
    return dyeUrl;
  }

  public void setDyeUrl(String dyeUrl) {
    this.dyeUrl = dyeUrl;
  }

  public String donacionesUrl() {
    return donacionesUrl;
  }

  public void setDonacionesUrl(String donacionesUrl) {
    this.donacionesUrl = donacionesUrl;
  }

  public String logisticaUrl() {
    return logisticaUrl;
  }

  public void setLogisticaUrl(String logisticaUrl) {
    this.logisticaUrl = logisticaUrl;
  }

  public String incentivosUrl() {
    return incentivosUrl;
  }

  public void setIncentivosUrl(String incentivosUrl) {
    this.incentivosUrl = incentivosUrl;
  }

  public String telegramBotUrl() {
    return telegramBotUrl;
  }

  public void setTelegramBotUrl(String telegramBotUrl) {
    this.telegramBotUrl = telegramBotUrl;
  }

  public RateLimit rateLimit() {
    return rateLimit;
  }

  public void setRateLimit(RateLimit rateLimit) {
    this.rateLimit = rateLimit;
  }

  public Cors cors() {
    return cors;
  }

  public void setCors(Cors cors) {
    this.cors = cors;
  }

  public int healthBackendTimeoutSec() {
    return healthBackendTimeoutSec;
  }

  public void setHealthBackendTimeoutSec(int healthBackendTimeoutSec) {
    this.healthBackendTimeoutSec = healthBackendTimeoutSec;
  }

  public String adminSecret() {
    return adminSecret;
  }

  public void setAdminSecret(String adminSecret) {
    this.adminSecret = adminSecret == null ? "" : adminSecret;
  }

  public int adminCleanTimeoutSec() {
    return adminCleanTimeoutSec;
  }

  public void setAdminCleanTimeoutSec(int adminCleanTimeoutSec) {
    this.adminCleanTimeoutSec = adminCleanTimeoutSec;
  }

  public static class RateLimit {
    private boolean enabled = true;
    private int requestsPerMinute = 120;

    public boolean enabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }

    public int requestsPerMinute() {
      return requestsPerMinute;
    }

    public void setRequestsPerMinute(int requestsPerMinute) {
      this.requestsPerMinute = requestsPerMinute;
    }
  }

  public static class Cors {
    private String allowedOrigins = "*";

    public String allowedOrigins() {
      return allowedOrigins;
    }

    public void setAllowedOrigins(String allowedOrigins) {
      this.allowedOrigins = allowedOrigins;
    }
  }
}
