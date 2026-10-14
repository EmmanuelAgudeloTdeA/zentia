import { pino, type Logger, type LevelWithSilent } from 'pino';

export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.logoDataUrl',
  '*.data',
];

export function createLogger(level: LevelWithSilent): Logger {
  return pino({ level, redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } });
}
