/** Puerto de salud: `true` si la base responde dentro del tiempo límite. */
export interface HealthCheck {
  isHealthy(): Promise<boolean>;
}
