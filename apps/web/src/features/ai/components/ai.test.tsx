import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { FollowUpMessageDto, InteractionDto } from '@zentia/shared';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../core/errors';
import es from '../../../lang/es.json';
import { interactionsService } from '../../follow-up';
import { quotesService } from '../../quotes';
import { useFollowUpHighlight } from '../hooks/use-follow-up-highlight';
import { aiService } from '../services/ai.service';
import { DashboardSections } from './dashboard-sections';
import { FollowUpAssistantPanel } from './follow-up-assistant-panel';
import { ProbabilityBadge } from './probability-badge';

const QUOTE_ID = '2b3c4d5e-6f70-4a81-9b2c-3d4e5f6a7b8c';
const CUSTOMER_ID = '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const QUOTE = {
  id: QUOTE_ID,
  displayNumber: 'COT-0012',
  customer: { id: CUSTOMER_ID, name: 'Acme' },
};

function suggestion(overrides: Partial<FollowUpMessageDto> = {}): FollowUpMessageDto {
  return {
    message: 'Hola Acme, soy Ana.',
    source: 'AI',
    highlighted: false,
    daysWithoutFollowUp: 2,
    contact: { phone: '573001234567', email: 'compras@acme.co' },
    ...overrides,
  };
}

function renderPanel(highlight: { highlighted: boolean; days: number } | null = null) {
  const onInteractionSaved = vi.fn();
  render(
    <FollowUpAssistantPanel
      quote={QUOTE}
      highlight={highlight}
      documentLocale="es"
      onStale={vi.fn()}
      onInteractionSaved={onInteractionSaved}
    />,
  );
  return { onInteractionSaved };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('FollowUpAssistantPanel', () => {
  it('highlights the assistant when the Y-day rule applies', () => {
    renderPanel({ highlighted: true, days: 6 });
    expect(screen.getByText('Lleva 6 días sin seguimiento.')).toBeTruthy();
    expect(screen.getByText(es.ai.assistant.help)).toBeTruthy();
  });

  it('opens WhatsApp with the edited text and pre-fills the interaction', async () => {
    vi.spyOn(aiService, 'suggestMessage').mockResolvedValue(suggestion());
    vi.spyOn(quotesService, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
    });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: es.ai.assistant.suggest }));
    const field = await screen.findByLabelText(es.ai.assistant.messageLabel);
    expect((field as HTMLTextAreaElement).value).toBe('Hola Acme, soy Ana.');
    expect(screen.getByText(es.ai.assistant.aiSource)).toBeTruthy();

    fireEvent.change(field, { target: { value: 'Hola Acme, ¿revisaste la propuesta?' } });
    fireEvent.click(screen.getByRole('button', { name: es.ai.assistant.openWhatsapp }));
    expect(open).toHaveBeenCalledWith(
      `https://wa.me/573001234567?text=${encodeURIComponent('Hola Acme, ¿revisaste la propuesta?')}`,
      '_blank',
      'noopener,noreferrer',
    );

    fireEvent.click(screen.getByRole('button', { name: es.ai.assistant.registerInteraction }));
    const note = (await screen.findByLabelText(
      new RegExp(es.interactions.fields.note),
    )) as HTMLTextAreaElement;
    expect(note.value).toBe('Hola Acme, ¿revisaste la propuesta?');
    expect(
      (screen.getByLabelText(new RegExp(es.interactions.fields.type)) as HTMLSelectElement).value,
    ).toBe('WHATSAPP');
  });

  it('shows the template notice, disables channels without contact data and confirms before replacing', async () => {
    const suggest = vi
      .spyOn(aiService, 'suggestMessage')
      .mockResolvedValue(
        suggestion({ source: 'TEMPLATE', contact: { phone: null, email: 'compras@acme.co' } }),
      );
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: es.ai.assistant.suggest }));
    expect(await screen.findByText(es.ai.assistant.templateNotice)).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: es.ai.assistant.openWhatsapp }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: es.ai.assistant.openEmail }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);

    fireEvent.change(screen.getByLabelText(es.ai.assistant.messageLabel), {
      target: { value: 'Texto propio' },
    });
    fireEvent.click(screen.getByRole('button', { name: es.ai.assistant.suggestAgain }));
    expect(screen.getByText(es.ai.assistant.replaceTitle)).toBeTruthy();
    expect(suggest).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: es.ai.assistant.replaceConfirm }));
    await waitFor(() => expect(suggest).toHaveBeenCalledTimes(2));
  });

  it('shows the rate limit message when the suggestion answers 429', async () => {
    vi.spyOn(aiService, 'suggestMessage').mockRejectedValue(new ApiError('RATE_LIMITED', 429));
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: es.ai.assistant.suggest }));
    expect(await screen.findByText(es.ai.assistant.rateLimited)).toBeTruthy();
  });

  it('opens the email client with a mailto link carrying the edited text', async () => {
    vi.spyOn(aiService, 'suggestMessage').mockResolvedValue(suggestion());
    vi.spyOn(quotesService, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
    });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: es.ai.assistant.suggest }));
    fireEvent.change(await screen.findByLabelText(es.ai.assistant.messageLabel), {
      target: { value: 'Texto editado & listo' },
    });
    fireEvent.click(screen.getByRole('button', { name: es.ai.assistant.openEmail }));
    expect(open).toHaveBeenCalledWith(
      `mailto:compras@acme.co?body=${encodeURIComponent('Texto editado & listo')}`,
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('disables every action when the message is emptied', async () => {
    vi.spyOn(aiService, 'suggestMessage').mockResolvedValue(suggestion());
    vi.spyOn(interactionsService, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 1,
    });
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: es.ai.assistant.suggest }));
    fireEvent.change(await screen.findByLabelText(es.ai.assistant.messageLabel), {
      target: { value: '  ' },
    });
    expect(screen.getByText(es.ai.assistant.emptyMessage)).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: es.ai.assistant.copy }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});

describe('ProbabilityBadge', () => {
  it('shows the factors on click', () => {
    render(
      <ProbabilityBadge
        probability={{
          quoteId: QUOTE_ID,
          probability: 35,
          label: 'RULES_ESTIMATE',
          factors: [
            { code: 'BASE', points: 40 },
            { code: 'RECENT_INTERACTION', points: 15 },
            { code: 'NO_FOLLOW_UP', points: -20 },
          ],
        }}
      />,
    );
    const trigger = screen.getByRole('button', { name: /35 %/ });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    expect(screen.getByRole('tooltip').textContent).toContain(
      es.ai.probability.factors.NO_FOLLOW_UP,
    );
    expect(screen.getByText('−20')).toBeTruthy();
    expect(screen.getByText('+15')).toBeTruthy();
  });
});

describe('DashboardSections', () => {
  it('renders the top probability block and the calibration card by key', () => {
    render(
      <MemoryRouter>
        <DashboardSections
          showOwner
          sections={[
            {
              key: 'topProbability',
              items: [
                {
                  quoteId: QUOTE_ID,
                  displayNumber: 'COT-0012',
                  customerName: 'Acme',
                  ownerName: 'Ana',
                  total: '1190000',
                  expiresAt: '2026-11-18',
                  probability: 65,
                },
              ],
            },
            {
              key: 'calibration',
              items: [{ closedCount: 12, threshold: 30, readyForCalibration: false }],
            },
            { key: 'unknown', items: [] },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(es.dashboard.sections.topProbability.title)).toBeTruthy();
    expect(screen.getAllByText('COT-0012').length).toBeGreaterThan(0);
    expect(screen.getByText('12 de 30 cotizaciones cerradas')).toBeTruthy();
    expect(screen.getByText(es.ai.calibration.notReady)).toBeTruthy();
  });
});

function interaction(occurredAt: string, quoteId: string | null): InteractionDto {
  return {
    id: crypto.randomUUID(),
    customerId: CUSTOMER_ID,
    quote: quoteId ? { id: quoteId, displayNumber: 'COT-0099' } : null,
    type: 'CALL',
    note: 'x',
    occurredAt,
    author: { id: crypto.randomUUID(), name: 'Ana' },
    createdAt: occurredAt,
  };
}

describe('useFollowUpHighlight', () => {
  const quote = {
    id: QUOTE_ID,
    customerId: CUSTOMER_ID,
    status: 'SENT',
    // 28/10 a las 22:00 en Bogotá (29/10 en UTC).
    sentAt: '2026-10-29T03:00:00.000Z',
  };

  function mockInteractions(byQuote: InteractionDto[], general: InteractionDto[]) {
    return vi.spyOn(interactionsService, 'list').mockImplementation(async (query) => {
      // Sin filtro, el cliente tendría una interacción reciente de otra cotización: no debe contar.
      const items = query.quoteId
        ? byQuote
        : query.withoutQuote === 'true'
          ? general
          : [interaction('2026-11-02T14:00:00.000Z', crypto.randomUUID())];
      return { items, total: items.length, page: 1, pageSize: 1 };
    });
  }

  it('ignores interactions of other quotes and counts days in Bogotá', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-02T15:00:00.000Z'));
    const list = mockInteractions([], []);
    const { result } = renderHook(() => useFollowUpHighlight(quote, 5));
    await waitFor(() => expect(result.current).not.toBeNull());
    // En UTC serían 4 días (29/10 → 02/11) y no se destacaría.
    expect(result.current).toEqual({ highlighted: true, days: 5 });
    expect(list).toHaveBeenCalledWith({ quoteId: QUOTE_ID, page: 1, pageSize: 1 });
    expect(list).toHaveBeenCalledWith({
      customerId: CUSTOMER_ID,
      withoutQuote: 'true',
      page: 1,
      pageSize: 1,
    });
  });

  it('uses the latest of the own quote interaction and the general customer contact', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-02T15:00:00.000Z'));
    mockInteractions(
      [interaction('2026-10-30T15:00:00.000Z', QUOTE_ID)],
      // 31/10 a las 21:00 en Bogotá (01/11 en UTC).
      [interaction('2026-11-01T02:00:00.000Z', null)],
    );
    const { result } = renderHook(() => useFollowUpHighlight(quote, 5));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toEqual({ highlighted: false, days: 2 });
  });
});
