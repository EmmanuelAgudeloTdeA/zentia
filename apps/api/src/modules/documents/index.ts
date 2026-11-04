import type { ModuleDefinition, ModuleDependencies } from '../../core/modules/index.js';
import {
  GenerateQuotePdfUseCase,
  GetShareLinksUseCase,
  ShareQuoteUseCase,
  type DocumentsDependencies,
} from './application/index.js';
import { JsonDocumentTranslator, PdfmakeRenderer } from './infrastructure/index.js';
import { createDocumentsOpenApi, createDocumentsRouter } from './presentation/index.js';

export {
  documentActions,
  type DocumentsInfrastructure,
  type DocumentTranslator,
  type PdfRenderer,
} from './application/index.js';
export { JsonDocumentTranslator, PdfmakeRenderer } from './infrastructure/index.js';

export function createDocumentsInfrastructure() {
  const translator = new JsonDocumentTranslator();
  return { translator, renderer: new PdfmakeRenderer(translator) };
}

export type DocumentsModuleOptions = ModuleDependencies & DocumentsDependencies;

export function createDocumentsModule({
  requireAuth,
  resourceLimiter: _resourceLimiter,
  ...deps
}: DocumentsModuleOptions): ModuleDefinition {
  return {
    name: 'documents',
    basePath: '/quotes',
    router: createDocumentsRouter({
      pdf: new GenerateQuotePdfUseCase(deps),
      shareLinks: new GetShareLinksUseCase(deps),
      share: new ShareQuoteUseCase(deps),
      requireAuth,
    }),
    openapi: createDocumentsOpenApi(),
  };
}
