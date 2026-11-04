import type { ProbabilityDto } from '@zentia/shared';
import { useEffect, useState } from 'react';
import { aiService } from '../services/ai.service';

export type ProbabilitiesState =
  | { status: 'idle' | 'loading' | 'error' }
  | { status: 'ready'; byId: ReadonlyMap<string, ProbabilityDto> };

/** Probabilidad de las Enviadas indicadas; no bloquea la página si falla. */
export function useProbabilities(quoteIds: readonly string[]): ProbabilitiesState {
  const key = quoteIds.join(',');
  const [state, setState] = useState<ProbabilitiesState>({ status: 'idle' });

  useEffect(() => {
    if (!key) {
      setState({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setState({ status: 'loading' });
    aiService
      .getProbabilities(key.split(','), controller.signal)
      .then((items) =>
        setState({ status: 'ready', byId: new Map(items.map((item) => [item.quoteId, item])) }),
      )
      .catch(() => !controller.signal.aborted && setState({ status: 'error' }));
    return () => controller.abort();
  }, [key]);

  return state;
}
