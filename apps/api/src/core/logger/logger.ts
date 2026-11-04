import { pino, type DestinationStream, type Logger, type LevelWithSilent } from 'pino';

export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.logoDataUrl',
  '*.data',
];

export function createLogger(level: LevelWithSilent, destination?: DestinationStream): Logger {
  const options = { level, redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } };
  return destination ? pino(options, destination) : pino(options);
}
