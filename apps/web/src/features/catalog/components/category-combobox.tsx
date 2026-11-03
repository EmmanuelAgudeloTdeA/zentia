import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Combobox } from '../../../shared/ui';
import { productsService } from '../services/products.service';

interface CategoryComboboxProps {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  onSelect: (category: string) => void;
  /** Permite crear una categoría nueva con el texto escrito. */
  allowCreate?: boolean;
  error?: string | undefined;
  required?: boolean;
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
}

export function CategoryCombobox({
  allowCreate = false,
  onSelect,
  onChange,
  value,
  ...props
}: CategoryComboboxProps) {
  const { t } = useTranslation();

  return (
    <Combobox<string>
      {...props}
      inputValue={value}
      onInputChange={onChange}
      loadOptions={(query, signal) => productsService.categories(query, signal)}
      getOptionKey={(category) => category}
      getOptionLabel={(category) => category}
      onSelect={onSelect}
      maxOptions={10}
      {...(allowCreate ? { onCreate: (created: string) => onSelect(created) } : {})}
      labels={{
        loading: t('common.combobox.loading'),
        noResults: t('common.combobox.noResults'),
        error: t('common.combobox.error'),
        ...(allowCreate
          ? { create: (created: string) => t('products.category.createNew', { value: created }) }
          : {}),
      }}
    />
  );
}
