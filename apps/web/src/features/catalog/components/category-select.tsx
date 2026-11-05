import { CATEGORY_MAX_LENGTH, normalizeCategoryLabel, toSearchKey } from '@zentia/shared';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, SearchSelect, TextField } from '../../../shared/ui';
import { productsService } from '../services/products.service';

interface CategorySelectProps {
  label: ReactNode;
  value: string;
  onChange: (category: string) => void;
  /** Agrega "Crear categoría" al pie del selector, con su modal. */
  allowCreate?: boolean;
  /** Primera opción para quitar el filtro (texto ya traducido). */
  allLabel?: string;
  placeholder?: string;
  error?: string | undefined;
  required?: boolean;
  className?: string;
}

export function CategorySelect({
  label,
  value,
  onChange,
  allowCreate = false,
  allLabel,
  placeholder,
  error,
  required,
  className,
}: CategorySelectProps) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState<string | null>(null);

  return (
    <>
      <SearchSelect<string>
        label={label}
        required={required}
        error={error}
        className={className}
        placeholder={placeholder ?? allLabel ?? t('products.category.placeholder')}
        value={value || null}
        loadOptions={async (query, signal) => {
          const categories = await productsService.categories(query, signal);
          return allLabel !== undefined && query === '' ? ['', ...categories] : categories;
        }}
        getOptionKey={(category) => category || '__all__'}
        getOptionLabel={(category) => category || allLabel || ''}
        onSelect={onChange}
        maxOptions={11}
        labels={{
          loading: t('common.combobox.loading'),
          noResults: t('common.combobox.noResults'),
          error: t('common.combobox.error'),
          search: t('products.category.search'),
        }}
        {...(allowCreate
          ? {
              footerAction: {
                label: t('products.category.create'),
                onSelect: (query: string) => setCreating(query),
              },
            }
          : {})}
      />
      {creating !== null ? (
        <CreateCategoryDialog
          initialName={creating}
          onClose={() => setCreating(null)}
          onCreated={(category) => {
            onChange(category);
            setCreating(null);
          }}
        />
      ) : null}
    </>
  );
}

interface CreateCategoryDialogProps {
  initialName: string;
  onClose: () => void;
  onCreated: (category: string) => void;
}

/** Sin `<form>`: el modal vive dentro del formulario del producto y no debe enviarlo. */
function CreateCategoryDialog({ initialName, onClose, onCreated }: CreateCategoryDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(false);
  const [checking, setChecking] = useState(false);
  const normalized = normalizeCategoryLabel(name);
  const invalid = normalized.length === 0 || normalized.length > CATEGORY_MAX_LENGTH;

  const confirm = async () => {
    setTouched(true);
    if (invalid) return;
    setChecking(true);
    // Reutiliza la forma escrita de una categoría equivalente (sin tildes ni mayúsculas).
    const key = toSearchKey(normalized);
    const existing = await productsService
      .categories(normalized)
      .then((categories) => categories.find((category) => toSearchKey(category) === key))
      .catch(() => undefined);
    setChecking(false);
    onCreated(existing ?? normalized);
  };

  return (
    <Dialog
      size="sm"
      title={t('products.category.createTitle')}
      description={t('products.category.createDescription')}
      onClose={onClose}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button loading={checking} onClick={() => void confirm()}>
            {t('products.category.createConfirm')}
          </Button>
        </>
      }
    >
      <TextField
        label={t('products.category.nameLabel')}
        required
        autoComplete="off"
        maxLength={CATEGORY_MAX_LENGTH}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => setTouched(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void confirm();
          }
        }}
        error={touched && invalid ? t('validation.required') : undefined}
      />
    </Dialog>
  );
}
