export interface TemporaryPasswordGenerator {
  /** Contraseña temporal que cumple la política de contraseñas. */
  generate(): string;
}
