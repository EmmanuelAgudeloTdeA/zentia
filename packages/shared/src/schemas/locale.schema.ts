import { z } from 'zod';
import { LOCALES } from '../enums/index.js';

export const localeSchema = z.enum(LOCALES);
