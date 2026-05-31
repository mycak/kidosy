import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CategoryDto, OfferTypeDto } from '@/types';
import type {
  OrganizerOfferFormValues,
  OrganizerOfferSubmitValues,
} from '@/features/organizer/api/organizer.types';
import { buildDefaultOfferFormValues } from '@/features/organizer/api/organizer.api';
import { organizerOfferFormSchema } from '@/features/organizer/schemas/offer-form.schema';
import { PRIMARY_CTA_CLASS } from '@/shared/constants/ui';

const VALIDATION_ISSUE_PATH_INDEX = 0;
const MAX_MAIN_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAIN_IMAGE_ERROR_KEY = 'mainImageFile';

type OrganizerOfferFormFieldName = keyof OrganizerOfferFormValues;

type OrganizerOfferFormErrors = Partial<
  Record<
    OrganizerOfferFormFieldName | typeof MAIN_IMAGE_ERROR_KEY | 'form',
    string
  >
>;

type OrganizerOfferFormProps = {
  offerTypes: OfferTypeDto[];
  categories: CategoryDto[];
  initialValues: OrganizerOfferFormValues | null;
  isPending: boolean;
  submitLabel: string;
  onSubmit: (values: OrganizerOfferSubmitValues) => Promise<void>;
};

export function OrganizerOfferForm({
  offerTypes,
  categories,
  initialValues,
  isPending,
  submitLabel,
  onSubmit,
}: OrganizerOfferFormProps) {
  const defaultValues = useMemo(
    () => buildDefaultOfferFormValues(offerTypes),
    [offerTypes],
  );

  const [formValues, setFormValues] =
    useState<OrganizerOfferFormValues>(defaultValues);
  const [mainImageFile, setMainImageFile] = useState<File | undefined>(
    undefined,
  );
  const [formErrors, setFormErrors] = useState<OrganizerOfferFormErrors>({});

  useEffect(() => {
    if (initialValues) {
      setFormValues(initialValues);
      setMainImageFile(undefined);
      return;
    }

    setFormValues(defaultValues);
    setMainImageFile(undefined);
  }, [defaultValues, initialValues]);

  const isCategoryChecked = (categoryId: string): boolean =>
    formValues.categoryIds.includes(categoryId);

  const toggleCategory = (categoryId: string) => {
    setFormValues((previousValues) => {
      if (previousValues.categoryIds.includes(categoryId)) {
        return {
          ...previousValues,
          categoryIds: previousValues.categoryIds.filter(
            (currentCategoryId) => currentCategoryId !== categoryId,
          ),
        };
      }

      return {
        ...previousValues,
        categoryIds: [...previousValues.categoryIds, categoryId],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationResult = organizerOfferFormSchema.safeParse(formValues);

    if (!validationResult.success) {
      const nextErrors: OrganizerOfferFormErrors = {};

      validationResult.error.issues.forEach((issue) => {
        const issuePath = issue.path[VALIDATION_ISSUE_PATH_INDEX];

        if (typeof issuePath === 'string') {
          nextErrors[issuePath as OrganizerOfferFormFieldName] = issue.message;
          return;
        }

        nextErrors.form = issue.message;
      });

      setFormErrors(nextErrors);
      return;
    }

    if (mainImageFile && mainImageFile.size > MAX_MAIN_IMAGE_SIZE_BYTES) {
      setFormErrors({
        [MAIN_IMAGE_ERROR_KEY]: 'Zdjęcie główne nie może przekraczać 5 MB.',
      });
      return;
    }

    setFormErrors({});
    await onSubmit({ ...formValues, mainImageFile });
  };

  const handleMainImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setMainImageFile(undefined);
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        [MAIN_IMAGE_ERROR_KEY]: undefined,
      }));
      return;
    }

    if (selectedFile.size > MAX_MAIN_IMAGE_SIZE_BYTES) {
      setMainImageFile(undefined);
      setFormErrors((previousErrors) => ({
        ...previousErrors,
        [MAIN_IMAGE_ERROR_KEY]: 'Zdjęcie główne nie może przekraczać 5 MB.',
      }));
      event.target.value = '';
      return;
    }

    setMainImageFile(selectedFile);
    setFormErrors((previousErrors) => ({
      ...previousErrors,
      [MAIN_IMAGE_ERROR_KEY]: undefined,
    }));
  };

  const hasOfferType = offerTypes.some(
    (offerType) => offerType.id === formValues.offerTypeId,
  );

  useEffect(() => {
    if (!hasOfferType && offerTypes[0]) {
      setFormValues((previousValues) => ({
        ...previousValues,
        offerTypeId: offerTypes[0].id,
      }));
    }
  }, [hasOfferType, offerTypes]);

  return (
    <form
      className='grid grid-cols-1 gap-4 lg:grid-cols-2'
      onSubmit={handleSubmit}
    >
      {formErrors.form ? (
        <p className='rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive lg:col-span-2'>
          {formErrors.form}
        </p>
      ) : null}

      <label className='flex flex-col gap-1 lg:col-span-2'>
        <span className='text-sm font-medium'>Tytuł oferty</span>
        <input
          value={formValues.title}
          onChange={(event) =>
            setFormValues((previousValues) => ({
              ...previousValues,
              title: event.target.value,
            }))
          }
          className='h-9 rounded-md border bg-background px-3 text-sm'
          required
        />
        {formErrors.title ? (
          <span className='text-xs text-destructive'>{formErrors.title}</span>
        ) : null}
      </label>

      <label className='flex flex-col gap-1 lg:col-span-2'>
        <span className='text-sm font-medium'>Opis</span>
        <textarea
          value={formValues.description}
          onChange={(event) =>
            setFormValues((previousValues) => ({
              ...previousValues,
              description: event.target.value,
            }))
          }
          className='min-h-28 rounded-md border bg-background px-3 py-2 text-sm'
          required
        />
        {formErrors.description ? (
          <span className='text-xs text-destructive'>
            {formErrors.description}
          </span>
        ) : null}
      </label>

      <label className='flex flex-col gap-1 lg:col-span-2'>
        <span className='text-sm font-medium'>Zdjęcie główne</span>
        <input
          type='file'
          accept='image/*'
          onChange={handleMainImageChange}
          className='rounded-md border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm'
        />
        <span className='text-xs text-muted-foreground'>
          Maksymalny rozmiar pliku: 5 MB.
        </span>
        {mainImageFile ? (
          <span className='text-xs text-muted-foreground'>
            Wybrano plik: {mainImageFile.name}
          </span>
        ) : null}
        {formErrors.mainImageFile ? (
          <span className='text-xs text-destructive'>
            {formErrors.mainImageFile}
          </span>
        ) : null}
      </label>

      <label className='flex flex-col gap-1'>
        <span className='text-sm font-medium'>Typ oferty</span>
        <select
          value={formValues.offerTypeId}
          onChange={(event) =>
            setFormValues((previousValues) => ({
              ...previousValues,
              offerTypeId: event.target.value,
            }))
          }
          className='h-9 rounded-md border bg-background px-3 text-sm'
          required
        >
          {offerTypes.map((offerType) => (
            <option key={offerType.id} value={offerType.id}>
              {offerType.name}
            </option>
          ))}
        </select>
        {formErrors.offerTypeId ? (
          <span className='text-xs text-destructive'>
            {formErrors.offerTypeId}
          </span>
        ) : null}
      </label>

      <label className='flex flex-col gap-1'>
        <span className='text-sm font-medium'>Status</span>
        <select
          value={formValues.status}
          onChange={(event) =>
            setFormValues((previousValues) => ({
              ...previousValues,
              status: event.target.value as OrganizerOfferFormValues['status'],
            }))
          }
          className='h-9 rounded-md border bg-background px-3 text-sm'
        >
          <option value='draft'>Szkic</option>
          <option value='pending_review'>Do moderacji</option>
          <option value='published'>Opublikowana</option>
          <option value='archived'>Archiwalna</option>
          <option value='rejected'>Odrzucona</option>
        </select>
      </label>

      <label className='flex flex-col gap-1'>
        <span className='text-sm font-medium'>Minimalny wiek</span>
        <input
          type='number'
          min={1}
          max={18}
          value={formValues.minAge}
          onChange={(event) =>
            setFormValues((previousValues) => ({
              ...previousValues,
              minAge: Number(event.target.value),
            }))
          }
          className='h-9 rounded-md border bg-background px-3 text-sm'
          required
        />
        {formErrors.minAge ? (
          <span className='text-xs text-destructive'>{formErrors.minAge}</span>
        ) : null}
      </label>

      <label className='flex flex-col gap-1'>
        <span className='text-sm font-medium'>Maksymalny wiek</span>
        <input
          type='number'
          min={1}
          max={18}
          value={formValues.maxAge}
          onChange={(event) =>
            setFormValues((previousValues) => ({
              ...previousValues,
              maxAge: Number(event.target.value),
            }))
          }
          className='h-9 rounded-md border bg-background px-3 text-sm'
          required
        />
        {formErrors.maxAge ? (
          <span className='text-xs text-destructive'>{formErrors.maxAge}</span>
        ) : null}
      </label>

      <label className='flex flex-col gap-1 lg:col-span-2'>
        <span className='text-sm font-medium'>Adres</span>
        <input
          value={formValues.address}
          onChange={(event) =>
            setFormValues((previousValues) => ({
              ...previousValues,
              address: event.target.value,
            }))
          }
          className='h-9 rounded-md border bg-background px-3 text-sm'
          required
        />
        {formErrors.address ? (
          <span className='text-xs text-destructive'>{formErrors.address}</span>
        ) : null}
      </label>

      <label className='flex flex-col gap-1'>
        <span className='text-sm font-medium'>Szerokość geograficzna</span>
        <input
          type='number'
          step='0.000001'
          value={formValues.latitude}
          onChange={(event) =>
            setFormValues((previousValues) => ({
              ...previousValues,
              latitude: Number(event.target.value),
            }))
          }
          className='h-9 rounded-md border bg-background px-3 text-sm'
          required
        />
        {formErrors.latitude ? (
          <span className='text-xs text-destructive'>
            {formErrors.latitude}
          </span>
        ) : null}
      </label>

      <label className='flex flex-col gap-1'>
        <span className='text-sm font-medium'>Długość geograficzna</span>
        <input
          type='number'
          step='0.000001'
          value={formValues.longitude}
          onChange={(event) =>
            setFormValues((previousValues) => ({
              ...previousValues,
              longitude: Number(event.target.value),
            }))
          }
          className='h-9 rounded-md border bg-background px-3 text-sm'
          required
        />
        {formErrors.longitude ? (
          <span className='text-xs text-destructive'>
            {formErrors.longitude}
          </span>
        ) : null}
      </label>

      <label className='flex flex-col gap-1'>
        <span className='text-sm font-medium'>Data startu</span>
        <input
          type='date'
          value={formValues.startDate}
          onChange={(event) =>
            setFormValues((previousValues) => ({
              ...previousValues,
              startDate: event.target.value,
            }))
          }
          className='h-9 rounded-md border bg-background px-3 text-sm'
          required
        />
        {formErrors.startDate ? (
          <span className='text-xs text-destructive'>
            {formErrors.startDate}
          </span>
        ) : null}
      </label>

      <label className='flex flex-col gap-1'>
        <span className='text-sm font-medium'>Data końca</span>
        <input
          type='date'
          value={formValues.endDate}
          onChange={(event) =>
            setFormValues((previousValues) => ({
              ...previousValues,
              endDate: event.target.value,
            }))
          }
          className='h-9 rounded-md border bg-background px-3 text-sm'
          required
        />
        {formErrors.endDate ? (
          <span className='text-xs text-destructive'>{formErrors.endDate}</span>
        ) : null}
      </label>

      <label className='flex flex-col gap-1'>
        <span className='text-sm font-medium'>Liczba miejsc</span>
        <input
          type='number'
          min={0}
          value={formValues.availableSpots}
          onChange={(event) =>
            setFormValues((previousValues) => ({
              ...previousValues,
              availableSpots: Number(event.target.value),
            }))
          }
          className='h-9 rounded-md border bg-background px-3 text-sm'
          required
        />
        {formErrors.availableSpots ? (
          <span className='text-xs text-destructive'>
            {formErrors.availableSpots}
          </span>
        ) : null}
      </label>

      <fieldset className='flex flex-col gap-2 lg:col-span-2'>
        <legend className='text-sm font-medium'>Kategorie</legend>
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
          {categories.map((category) => (
            <label
              key={category.id}
              className='flex items-center gap-2 rounded-md border px-3 py-2 text-sm'
            >
              <input
                type='checkbox'
                checked={isCategoryChecked(category.id)}
                onChange={() => toggleCategory(category.id)}
              />
              <span>{category.name}</span>
            </label>
          ))}
        </div>
        {formErrors.categoryIds ? (
          <span className='text-xs text-destructive'>
            {formErrors.categoryIds}
          </span>
        ) : null}
      </fieldset>

      <div className='flex justify-end lg:col-span-2'>
        <Button
          type='submit'
          className={PRIMARY_CTA_CLASS}
          disabled={isPending || !formValues.offerTypeId}
        >
          {isPending ? 'Zapisywanie...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
