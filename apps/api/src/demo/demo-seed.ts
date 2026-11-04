import type { Customer, Prisma, PrismaClient, Product, QuoteStatus } from '@prisma/client';
import {
  calculateQuoteTotals,
  quoteTotalsToStrings,
  toSearchKey,
  type InteractionType,
  type VatRate,
} from '@zentia/shared';

/** RN-41: todo lo sintético queda marcado (documento `DEMO…`, nombre `[DEMO]`). */
export const DEMO_PREFIX = '[DEMO]';
export const DEMO_DOCUMENT_PREFIX = 'DEMO';

export class DemoSeedRefusedError extends Error {}

/** No se ejecuta en producción salvo con `ALLOW_DEMO_SEED=true`. */
export function assertDemoSeedAllowed(env: {
  NODE_ENV?: string | undefined;
  ALLOW_DEMO_SEED?: string | undefined;
}) {
  if (env.NODE_ENV === 'production' && env.ALLOW_DEMO_SEED !== 'true') {
    throw new DemoSeedRefusedError(
      'Demo seed is disabled in production (set ALLOW_DEMO_SEED=true to allow it)',
    );
  }
}

/** Generador determinista (mulberry32): la demo es reproducible. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const CUSTOMERS = [
  'Estudio Creativo',
  'Constructora Andina',
  'Clínica del Valle',
  'Distribuidora Norte',
  'Colegio San Martín',
  'Hotel La Montaña',
  'Logística Express',
  'Café Origen',
];

const PRODUCTS: { name: string; category: string; price: number; vatRate: VatRate }[] = [
  { name: 'Portátil empresarial', category: 'Tecnología', price: 3_200_000, vatRate: 'GENERAL_19' },
  { name: 'Monitor 27 pulgadas', category: 'Tecnología', price: 1_150_000, vatRate: 'GENERAL_19' },
  {
    name: 'Licencia de software anual',
    category: 'Software',
    price: 890_000,
    vatRate: 'GENERAL_19',
  },
  {
    name: 'Instalación y configuración',
    category: 'Servicios',
    price: 450_000,
    vatRate: 'GENERAL_19',
  },
  { name: 'Soporte técnico mensual', category: 'Servicios', price: 600_000, vatRate: 'GENERAL_19' },
  { name: 'Silla ergonómica', category: 'Mobiliario', price: 780_000, vatRate: 'GENERAL_19' },
  { name: 'Kit de cafetería', category: 'Insumos', price: 120_000, vatRate: 'REDUCED_5' },
  { name: 'Capacitación presencial', category: 'Formación', price: 1_500_000, vatRate: 'EXEMPT' },
];

const INTERACTION_TYPES: InteractionType[] = ['CALL', 'EMAIL', 'WHATSAPP', 'MEETING'];

const DAY = 86_400_000;

export interface DemoSeedResult {
  skipped: boolean;
  customers: number;
  products: number;
  quotes: number;
}

/** Crea una demo de 6 meses: clientes, productos, cotizaciones en todos los estados, versiones, eventos e interacciones. */
export async function seedDemoData(
  prisma: PrismaClient,
  now = new Date(),
): Promise<DemoSeedResult> {
  const existing = await prisma.customer.count({
    where: { documentId: { startsWith: DEMO_DOCUMENT_PREFIX } },
  });
  if (existing > 0) return { skipped: true, customers: 0, products: 0, quotes: 0 };

  const owners = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  const sellers = owners.filter((user) => user.role !== 'ADMIN');
  const team = sellers.length > 0 ? sellers : owners;
  if (team.length === 0)
    throw new Error('Demo seed needs at least one active user (run the base seed first)');
  const settings = await prisma.companySettings.findUnique({ where: { id: 1 } });
  const validityDays = settings?.validityDays ?? 15;
  const rand = random(2026);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)] as T;

  const customers: Customer[] = [];
  for (const [index, name] of CUSTOMERS.entries()) {
    const owner = team[index % team.length]!;
    customers.push(
      await prisma.customer.create({
        data: {
          name: `${DEMO_PREFIX} ${name}`,
          nameKey: toSearchKey(`${DEMO_PREFIX} ${name}`),
          documentId: `${DEMO_DOCUMENT_PREFIX}${String(index + 1).padStart(4, '0')}`,
          phone: `57300000${String(index + 1).padStart(4, '0')}`,
          email: `demo${index + 1}@example.com`,
          createdById: owner.id,
        },
      }),
    );
  }
  const products: Product[] = [];
  for (const product of PRODUCTS) {
    const name = `${DEMO_PREFIX} ${product.name}`;
    products.push(
      await prisma.product.create({
        data: {
          name,
          nameKey: toSearchKey(name),
          category: product.category,
          categoryKey: toSearchKey(product.category),
          price: product.price,
          vatRate: product.vatRate,
        },
      }),
    );
  }

  const day = (date: Date) => new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
  let quotes = 0;
  for (let i = 0; i < 48; i++) {
    const owner = team[i % team.length]!;
    const customer = pick(customers);
    const createdAt = new Date(now.getTime() - Math.floor(rand() * 180 + 1) * DAY);
    const lines = [
      ...new Set(Array.from({ length: 1 + Math.floor(rand() * 3) }, () => pick(products))),
    ].map((product, position) => ({
      product,
      position: position + 1,
      quantity: String(1 + Math.floor(rand() * 5)),
    }));
    const discountPct = pick(['0', '0', '5', '10']);
    const shippingAmount = pick(['0', '0', '25000', '40000']);
    const totals = quoteTotalsToStrings(
      calculateQuoteTotals({
        items: lines.map(({ product, quantity }) => ({
          unitPrice: product.price.toFixed(0),
          quantity,
          vatRate: product.vatRate,
        })),
        discountPct,
        shippingAmount,
        shippingTaxable: false,
      }),
    );

    const sentAt = new Date(createdAt.getTime() + DAY);
    const expiresAt = new Date(day(sentAt).getTime() + validityDays * DAY);
    const ageDays = (now.getTime() - sentAt.getTime()) / DAY;
    const roll = rand();
    let status: QuoteStatus;
    if (roll < 0.08) status = 'DRAFT';
    else if (roll < 0.14) status = 'VOIDED';
    else if (ageDays < validityDays) status = 'SENT';
    else if (roll < 0.55) status = 'APPROVED';
    else if (roll < 0.8) status = 'REJECTED';
    else status = 'EXPIRED';
    const sent = status !== 'DRAFT' && !(status === 'VOIDED' && roll < 0.11);

    await prisma.$transaction(async (tx) => {
      const [sequence] = await tx.$queryRaw<{ lastValue: number }[]>`
        UPDATE "QuoteSequence" SET "lastValue" = "lastValue" + 1 WHERE "key" = 'QUOTE' RETURNING "lastValue"`;
      const quote = await tx.quote.create({
        data: {
          number: sequence?.lastValue ?? i + 1,
          customerId: customer.id,
          ownerId: owner.id,
          createdById: owner.id,
          status,
          discountPct,
          discountAmount: totals.discountAmount,
          shippingAmount,
          shippingTaxable: false,
          subtotal: totals.subtotal,
          linesVat: totals.linesVat,
          shippingVat: totals.shippingVat,
          total: totals.total,
          createdAt,
          ...(sent
            ? {
                sentAt,
                firstSentAt: sentAt,
                expiresAt,
                currentVersion: 1,
                ...(status === 'APPROVED'
                  ? { approvedAt: new Date(sentAt.getTime() + 3 * DAY) }
                  : {}),
              }
            : {}),
          items: {
            create: lines.map(({ product, position, quantity }, index) => ({
              productId: product.id,
              position,
              productName: product.name,
              category: product.category,
              unitPrice: product.price,
              vatRate: product.vatRate,
              quantity,
              lineAmount: totals.lineAmounts[index] ?? '0',
            })),
          },
        },
      });
      if (!sent) return;
      const version = await tx.quoteVersion.create({
        data: {
          quoteId: quote.id,
          number: 1,
          snapshot: {
            ...totals,
            discountPct,
            shippingAmount,
            synthetic: true,
          } as Prisma.InputJsonValue,
          authorId: owner.id,
          createdAt: sentAt,
        },
      });
      const events: Prisma.QuoteEventCreateManyInput[] = [
        {
          quoteId: quote.id,
          type: 'STATE_CHANGED',
          actorId: owner.id,
          versionId: version.id,
          data: { from: 'DRAFT', to: 'SENT' },
          createdAt: sentAt,
        },
      ];
      if (status !== 'SENT') {
        events.push({
          quoteId: quote.id,
          type: 'STATE_CHANGED',
          actorId: status === 'EXPIRED' ? null : owner.id,
          note: status === 'VOIDED' ? 'Demostración' : null,
          data: { from: 'SENT', to: status },
          createdAt: new Date(Math.min(now.getTime(), sentAt.getTime() + 4 * DAY)),
        });
      }
      await tx.quoteEvent.createMany({ data: events });
      const contacts = Math.floor(rand() * 3);
      for (let c = 0; c < contacts; c++) {
        const occurredAt = new Date(
          Math.min(now.getTime() - DAY, sentAt.getTime() + (c + 1) * 2 * DAY),
        );
        await tx.interaction.create({
          data: {
            customerId: customer.id,
            quoteId: quote.id,
            type: pick(INTERACTION_TYPES),
            note: `${DEMO_PREFIX} Contacto de seguimiento`,
            occurredAt,
            authorId: owner.id,
          },
        });
      }
    });
    quotes++;
  }
  return { skipped: false, customers: customers.length, products: products.length, quotes };
}
