import cron from 'node-cron';
import type { Logger } from 'pino';

export const SCHEDULER_TIMEZONE = 'America/Bogota';

export interface ScheduledJob {
  name: string;
  /** Expresión cron en America/Bogota. */
  cron: string;
  /** Devuelve la cantidad de registros procesados (para el log). */
  run: () => Promise<number>;
}

export interface Scheduler {
  register(job: ScheduledJob): void;
  runNow(name: string): Promise<void>;
  stop(): void;
}

/** Envuelve la ejecución con log de inicio, cantidad, duración y error; nunca lanza. */
export async function runJob(job: ScheduledJob, logger: Logger): Promise<void> {
  const startedAt = performance.now();
  logger.info({ job: job.name }, 'Job started');
  try {
    const processed = await job.run();
    const durationMs = Math.round(performance.now() - startedAt);
    logger.info({ job: job.name, processed, durationMs }, 'Job finished');
  } catch (error) {
    logger.error({ job: job.name, err: error }, 'Job failed');
  }
}

/** Deuda conocida: con varias instancias el cron corre en cada una; el advisory lock del job lo mitiga. */
export class NodeCronScheduler implements Scheduler {
  private readonly jobs = new Map<string, ScheduledJob>();
  private readonly tasks: { stop: () => void | Promise<void> }[] = [];

  constructor(private readonly logger: Logger) {}

  register(job: ScheduledJob): void {
    this.jobs.set(job.name, job);
    this.tasks.push(
      cron.schedule(job.cron, () => runJob(job, this.logger), {
        name: job.name,
        timezone: SCHEDULER_TIMEZONE,
        noOverlap: true,
      }),
    );
  }

  async runNow(name: string): Promise<void> {
    const job = this.jobs.get(name);
    if (job) await runJob(job, this.logger);
  }

  stop(): void {
    for (const task of this.tasks) void task.stop();
  }
}

export interface SchedulerStartup {
  scheduler: Scheduler | null;
  /** Pasada de recuperación al arrancar; resuelve cuando terminan todos los jobs. */
  recovery: Promise<void>;
}

/** Registra los jobs y lanza la pasada de recuperación en orden (vencer antes de alertar). */
export function startScheduler(options: {
  enabled: boolean;
  create: () => Scheduler;
  jobs: readonly ScheduledJob[];
}): SchedulerStartup {
  if (!options.enabled) return { scheduler: null, recovery: Promise.resolve() };
  const scheduler = options.create();
  for (const job of options.jobs) scheduler.register(job);
  const recovery = (async () => {
    for (const job of options.jobs) await scheduler.runNow(job.name);
  })();
  return { scheduler, recovery };
}
