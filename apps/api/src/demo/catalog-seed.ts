import type { PrismaClient } from '@prisma/client';
import { toSearchKey, type VatRate } from '@zentia/shared';
import { DEMO_DOCUMENT_PREFIX, DEMO_PREFIX } from './demo-seed.js';

/** Documento de los clientes del catálogo (`DEMOCLI…`): distinto del de `seedDemoData` (`DEMO0…`). */
export const CATALOG_DOCUMENT_PREFIX = `${DEMO_DOCUMENT_PREFIX}CLI`;

const CUSTOMERS: readonly { name: string; city: string; phone: boolean; email: boolean }[] = [
  { name: 'Ferretería El Tornillo', city: 'Medellín', phone: true, email: true },
  { name: 'Distribuidora Andina', city: 'Bogotá', phone: true, email: true },
  { name: 'Panadería La Espiga', city: 'Cali', phone: true, email: false },
  { name: 'Clínica Dental Sonrisas', city: 'Medellín', phone: true, email: true },
  { name: 'Constructora Horizonte', city: 'Barranquilla', phone: false, email: true },
  { name: 'Colegio San Martín', city: 'Envigado', phone: true, email: true },
  { name: 'Restaurante Sazón Paisa', city: 'Medellín', phone: true, email: false },
  { name: 'Agencia Creativa Pixel', city: 'Bogotá', phone: false, email: true },
  { name: 'Hotel Mirador del Río', city: 'Santa Fe de Antioquia', phone: true, email: true },
  { name: 'Transportes Rápidos del Valle', city: 'Palmira', phone: true, email: true },
  { name: 'Droguería Salud Total', city: 'Itagüí', phone: true, email: false },
  { name: 'Taller Automotriz Turbo', city: 'Bello', phone: true, email: true },
  { name: 'Consultorio Jurídico Restrepo', city: 'Bogotá', phone: false, email: true },
  { name: 'Gimnasio Fuerza Vital', city: 'Rionegro', phone: true, email: true },
  { name: 'Floristería Primavera', city: 'Pereira', phone: true, email: false },
  { name: 'Inmobiliaria Casa Propia', city: 'Manizales', phone: true, email: true },
  { name: 'Cooperativa Cafetera del Sur', city: 'Pitalito', phone: true, email: true },
  { name: 'Laboratorio Óptico Visión', city: 'Bucaramanga', phone: false, email: true },
  { name: 'Veterinaria Patitas', city: 'Sabaneta', phone: true, email: true },
  { name: 'Textiles La Montaña', city: 'Medellín', phone: true, email: true },
  { name: 'Supermercado Don Pedro', city: 'Cartagena', phone: true, email: false },
  { name: 'Estudio Contable Ávila & Asociados', city: 'Bogotá', phone: true, email: true },
  { name: 'Academia de Idiomas Global', city: 'Cali', phone: false, email: true },
  { name: 'Lavandería Burbujas', city: 'Envigado', phone: true, email: false },
  { name: 'Centro de Eventos La Hacienda', city: 'Llanogrande', phone: true, email: true },
  { name: 'Papelería Escolar Arcoíris', city: 'Montería', phone: true, email: true },
  { name: 'Granja Avícola El Gallo', city: 'Girardota', phone: true, email: false },
  { name: 'Spa Renacer', city: 'Medellín', phone: true, email: true },
  { name: 'Seguridad Privada Centinela', city: 'Bogotá', phone: false, email: true },
  { name: 'Eléctricos y Redes del Norte', city: 'Santa Marta', phone: true, email: true },
  { name: 'Fundación Manos Unidas', city: 'Pasto', phone: true, email: true },
  { name: 'Carpintería Roble Fino', city: 'La Ceja', phone: true, email: false },
  { name: 'Café Origen Especial', city: 'Armenia', phone: true, email: true },
  { name: 'Ingeniería Hidráulica Caudal', city: 'Ibagué', phone: false, email: true },
  { name: 'Peluquería Estilo Urbano', city: 'Medellín', phone: true, email: false },
  { name: 'Mudanzas Seguras Express', city: 'Bogotá', phone: true, email: true },
  { name: 'Clínica Veterinaria Huellitas', city: 'Villavicencio', phone: true, email: true },
  { name: 'Almacén Agropecuario El Campo', city: 'Tuluá', phone: true, email: true },
  { name: 'Diseño de Interiores Ambiente', city: 'Cúcuta', phone: false, email: true },
  { name: 'Panificadora Trigo de Oro', city: 'Popayán', phone: true, email: false },
];

const PRODUCTS: readonly { name: string; category: string; price: number; vatRate: VatRate }[] = [
  { name: 'Portátil 14" Core i5', category: 'Tecnología', price: 2_890_000, vatRate: 'GENERAL_19' },
  { name: 'Portátil 15" Core i7', category: 'Tecnología', price: 3_950_000, vatRate: 'GENERAL_19' },
  { name: 'Monitor 24" Full HD', category: 'Tecnología', price: 690_000, vatRate: 'GENERAL_19' },
  { name: 'Monitor 27" 4K', category: 'Tecnología', price: 1_450_000, vatRate: 'GENERAL_19' },
  {
    name: 'Teclado y mouse inalámbricos',
    category: 'Tecnología',
    price: 145_000,
    vatRate: 'GENERAL_19',
  },
  {
    name: 'Impresora multifuncional láser',
    category: 'Tecnología',
    price: 1_180_000,
    vatRate: 'GENERAL_19',
  },
  { name: 'Disco SSD 1 TB', category: 'Tecnología', price: 380_000, vatRate: 'GENERAL_19' },
  { name: 'Router Wi-Fi 6', category: 'Redes', price: 420_000, vatRate: 'GENERAL_19' },
  { name: 'Switch 24 puertos', category: 'Redes', price: 950_000, vatRate: 'GENERAL_19' },
  {
    name: 'Cableado estructurado por punto',
    category: 'Redes',
    price: 180_000,
    vatRate: 'GENERAL_19',
  },
  { name: 'Access point empresarial', category: 'Redes', price: 610_000, vatRate: 'GENERAL_19' },
  { name: 'Cámara de seguridad IP', category: 'Seguridad', price: 320_000, vatRate: 'GENERAL_19' },
  { name: 'Grabador NVR 8 canales', category: 'Seguridad', price: 890_000, vatRate: 'GENERAL_19' },
  {
    name: 'Control de acceso biométrico',
    category: 'Seguridad',
    price: 1_250_000,
    vatRate: 'GENERAL_19',
  },
  { name: 'Licencia antivirus anual', category: 'Software', price: 160_000, vatRate: 'GENERAL_19' },
  {
    name: 'Licencia suite ofimática anual',
    category: 'Software',
    price: 420_000,
    vatRate: 'GENERAL_19',
  },
  {
    name: 'Software de facturación (plan anual)',
    category: 'Software',
    price: 1_800_000,
    vatRate: 'GENERAL_19',
  },
  { name: 'Hosting web anual', category: 'Software', price: 350_000, vatRate: 'GENERAL_19' },
  { name: 'Silla ergonómica', category: 'Mobiliario', price: 780_000, vatRate: 'GENERAL_19' },
  { name: 'Escritorio en L', category: 'Mobiliario', price: 1_150_000, vatRate: 'GENERAL_19' },
  {
    name: 'Archivador metálico 4 gavetas',
    category: 'Mobiliario',
    price: 640_000,
    vatRate: 'GENERAL_19',
  },
  {
    name: 'Mesa de juntas 8 puestos',
    category: 'Mobiliario',
    price: 2_400_000,
    vatRate: 'GENERAL_19',
  },
  { name: 'Biblioteca modular', category: 'Mobiliario', price: 520_000, vatRate: 'GENERAL_19' },
  { name: 'Resma de papel carta', category: 'Papelería', price: 21_000, vatRate: 'GENERAL_19' },
  { name: 'Caja de bolígrafos x 12', category: 'Papelería', price: 14_500, vatRate: 'GENERAL_19' },
  { name: 'Cuaderno argollado', category: 'Papelería', price: 9_800, vatRate: 'EXEMPT' },
  {
    name: 'Tóner para impresora láser',
    category: 'Papelería',
    price: 260_000,
    vatRate: 'GENERAL_19',
  },
  { name: 'Carpetas AZ x 10', category: 'Papelería', price: 78_000, vatRate: 'GENERAL_19' },
  { name: 'Café de origen 500 g', category: 'Cafetería', price: 32_000, vatRate: 'REDUCED_5' },
  { name: 'Azúcar 1 kg', category: 'Cafetería', price: 5_200, vatRate: 'REDUCED_5' },
  { name: 'Vasos desechables x 100', category: 'Cafetería', price: 11_000, vatRate: 'GENERAL_19' },
  { name: 'Cafetera industrial', category: 'Cafetería', price: 1_650_000, vatRate: 'GENERAL_19' },
  { name: 'Dispensador de agua', category: 'Cafetería', price: 480_000, vatRate: 'GENERAL_19' },
  { name: 'Desinfectante multiusos 4 L', category: 'Aseo', price: 38_000, vatRate: 'GENERAL_19' },
  { name: 'Toallas de papel x 6', category: 'Aseo', price: 27_000, vatRate: 'GENERAL_19' },
  { name: 'Jabón líquido de manos 1 L', category: 'Aseo', price: 16_500, vatRate: 'GENERAL_19' },
  { name: 'Kit de aseo para oficina', category: 'Aseo', price: 145_000, vatRate: 'GENERAL_19' },
  { name: 'Guantes de nitrilo x 100', category: 'Dotación', price: 34_000, vatRate: 'EXEMPT' },
  { name: 'Botas de seguridad', category: 'Dotación', price: 189_000, vatRate: 'GENERAL_19' },
  { name: 'Casco de seguridad', category: 'Dotación', price: 45_000, vatRate: 'GENERAL_19' },
  { name: 'Uniforme corporativo', category: 'Dotación', price: 125_000, vatRate: 'GENERAL_19' },
  { name: 'Chaleco reflectivo', category: 'Dotación', price: 28_000, vatRate: 'GENERAL_19' },
  { name: 'Taladro percutor', category: 'Herramientas', price: 365_000, vatRate: 'GENERAL_19' },
  {
    name: 'Juego de destornilladores',
    category: 'Herramientas',
    price: 72_000,
    vatRate: 'GENERAL_19',
  },
  {
    name: 'Escalera de aluminio 6 pasos',
    category: 'Herramientas',
    price: 298_000,
    vatRate: 'GENERAL_19',
  },
  { name: 'Pulidora angular', category: 'Herramientas', price: 255_000, vatRate: 'GENERAL_19' },
  {
    name: 'Instalación y configuración',
    category: 'Servicios',
    price: 450_000,
    vatRate: 'GENERAL_19',
  },
  { name: 'Soporte técnico mensual', category: 'Servicios', price: 600_000, vatRate: 'GENERAL_19' },
  {
    name: 'Mantenimiento preventivo de equipos',
    category: 'Servicios',
    price: 95_000,
    vatRate: 'GENERAL_19',
  },
  { name: 'Visita técnica', category: 'Servicios', price: 120_000, vatRate: 'GENERAL_19' },
  { name: 'Diseño de logotipo', category: 'Servicios', price: 850_000, vatRate: 'GENERAL_19' },
  {
    name: 'Desarrollo de página web',
    category: 'Servicios',
    price: 3_500_000,
    vatRate: 'GENERAL_19',
  },
  {
    name: 'Gestión de redes sociales (mes)',
    category: 'Servicios',
    price: 1_200_000,
    vatRate: 'GENERAL_19',
  },
  {
    name: 'Capacitación presencial (8 h)',
    category: 'Formación',
    price: 1_500_000,
    vatRate: 'EXEMPT',
  },
  { name: 'Curso virtual de Excel', category: 'Formación', price: 280_000, vatRate: 'EXEMPT' },
  {
    name: 'Taller de servicio al cliente',
    category: 'Formación',
    price: 900_000,
    vatRate: 'EXEMPT',
  },
  {
    name: 'Transporte local de mercancía',
    category: 'Logística',
    price: 150_000,
    vatRate: 'GENERAL_19',
  },
  { name: 'Embalaje y rotulado', category: 'Logística', price: 45_000, vatRate: 'GENERAL_19' },
  {
    name: 'Almacenamiento por estiba (mes)',
    category: 'Logística',
    price: 110_000,
    vatRate: 'GENERAL_19',
  },
  { name: 'Envío nacional express', category: 'Logística', price: 38_000, vatRate: 'GENERAL_19' },
];

export interface CatalogSeedResult {
  customers: number;
  products: number;
}

/** Clientes y productos de prueba marcados (RN-41); idempotente: solo crea lo que falta. */
export async function seedDemoCatalog(prisma: PrismaClient): Promise<CatalogSeedResult> {
  const creator = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!creator) throw new Error('Catalog seed needs an active user (run the base seed first)');

  let customers = 0;
  for (const [index, customer] of CUSTOMERS.entries()) {
    const number = String(index + 1).padStart(4, '0');
    const documentId = `${CATALOG_DOCUMENT_PREFIX}${number}`;
    if (await prisma.customer.findUnique({ where: { documentId } })) continue;
    const name = `${DEMO_PREFIX} ${customer.name}`;
    await prisma.customer.create({
      data: {
        name,
        nameKey: toSearchKey(name),
        documentId,
        phone: customer.phone ? `57310${number}${String(index * 7).padStart(3, '0')}` : null,
        email: customer.email ? `cliente${index + 1}@example.com` : null,
        createdById: creator.id,
      },
    });
    customers++;
  }

  let products = 0;
  for (const product of PRODUCTS) {
    const name = `${DEMO_PREFIX} ${product.name}`;
    const nameKey = toSearchKey(name);
    if (await prisma.product.findFirst({ where: { nameKey } })) continue;
    await prisma.product.create({
      data: {
        name,
        nameKey,
        category: product.category,
        categoryKey: toSearchKey(product.category),
        price: product.price,
        vatRate: product.vatRate,
      },
    });
    products++;
  }
  return { customers, products };
}
