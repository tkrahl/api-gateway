package ar.edu.utn.dds.k3003.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "gateway")
public class GatewayProperties {

  private String dyeUrl = "https://donadores-entidades.onrender.com";
  private String donacionesUrl = "https://donaciones-dgs7.onrender.com";
  private String logisticaUrl = "https://logisticaweb.onrender.com";
  private String incentivosUrl = "https://incentivos-movn.onrender.com";
  private Cors cors = new Cors();
  private int healthBackendTimeoutSec = 45;

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
