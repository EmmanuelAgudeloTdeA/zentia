import type { OrderSummaryDto } from '@zentia/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { errorKey } from '../../../core/errors';
import { Alert, BoxIcon, Button, ConfirmDialog, toast } from '../../../shared/ui';
import { ordersService } from '../services/orders.service';
import { OrderStatusBadge } from './order-status-badge';

interface QuoteOrderActionProps {
  quoteId: string;
  quoteNumber: string;
  allowedActions: readonly string[];
  /** Al fallar la conversión (p. ej., ya existía), el detalle de la cotización se recarga. */
  onReload: () => void;
}

/** S7.1.1: "Convertir en pedido" en una Aprobada sin pedido, o "Ver pedido" si ya lo tiene. */
export function QuoteOrderAction({
  quoteId,
  quoteNumber,
  allowedActions,
  onReload,
}: QuoteOrderActionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canConvert = allowedActions.includes('convertToOrder');
  const hasOrder = allowedActions.includes('viewOrder');
  const [order, setOrder] = useState<OrderSummaryDto | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [lookupFailed, setLookupFailed] = useState(false);

  useEffect(() => {
    if (!hasOrder) return;
    let cancelled = false;
    setLookupFailed(false);
    ordersService.getByQuote(quoteId).then(
      (result) => !cancelled && setOrder(result),
      () => !cancelled && setLookupFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [hasOrder, quoteId]);

  if (hasOrder) {
    const linkClass =
      'inline-flex h-10 items-center gap-2 rounded-md bg-neutral-0 px-4 text-button text-primary-900 uppercase shadow-sm hover:bg-primary-50';
    if (order) {
      return (
        <Link to={`/orders/${order.id}`} className={linkClass}>
          <BoxIcon size={16} />
          {t('orders.actions.view', { number: order.displayNumber })}
          <OrderStatusBadge status={order.status} size="sm" />
        </Link>
      );
    }
    // Si no se pudo consultar el pedido, se ofrece la lista para no ocultar que existe.
    return lookupFailed ? (
      <Link to="/orders" className={linkClass}>
        <BoxIcon size={16} />
        {t('orders.backToList')}
      </Link>
    ) : null;
  }
  if (!canConvert) return null;

  const orderNumber = quoteNumber.replace(/^COT-/, 'PED-');
  const convert = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await ordersService.convert(quoteId);
      toast.success(t('orders.toast.created', { number: created.displayNumber }));
      navigate(`/orders/${created.id}`);
    } catch (convertError) {
      setError(convertError);
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="on-dark" icon={<BoxIcon size={16} />} onClick={() => setConfirming(true)}>
        {t('orders.actions.convert')}
      </Button>
      {confirming ? (
        <ConfirmDialog
          title={t('orders.convert.title', { quote: quoteNumber })}
          description={t('orders.convert.description', { order: orderNumber })}
          confirmLabel={t('orders.actions.convert')}
          confirmVariant="primary"
          cancelLabel={t('common.cancel')}
          loading={busy}
          error={error ? <Alert tone="danger">{t(errorKey(error))}</Alert> : null}
          onConfirm={() => void convert()}
          onCancel={() => {
            setConfirming(false);
            if (error) onReload();
            setError(null);
          }}
        />
      ) : null}
    </>
  );
}
