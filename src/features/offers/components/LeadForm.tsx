import { useForm } from '@tanstack/react-form';
import { useCreateLead } from '../queries/useCreateLead';
import { createLeadSchema, type CreateLeadFormData } from '../types';
import { Plus, Trash2 } from 'lucide-react';

const MIN_CHILDREN_COUNT = 1;
const MAX_CHILDREN_COUNT = 10;

const DEFAULT_CHILD_VALUE: CreateLeadFormData['children'][number] = {
  name: '',
  age: 0,
  interests: [],
};

interface LeadFormProps {
  offerId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function LeadForm({ offerId, onSuccess, onCancel }: LeadFormProps) {
  const createLeadMutation = useCreateLead();

  const form = useForm({
    defaultValues: {
      email: '',
      phone: '',
      name: '',
      children: [{ name: '', age: 0, interests: [] }],
      contact_preference: 'email' as const,
      additional_message: '',
      consent_communication: false,
      consent_marketing: false,
    } as CreateLeadFormData,
    onSubmit: async ({ value }) => {
      const result = createLeadSchema.safeParse(value);
      if (!result.success) {
        return;
      }

      try {
        await createLeadMutation.mutateAsync({
          offerId,
          data: result.data,
        });
        // TODO: Add sending a confirmation email to the parent after successful lead creation.
        onSuccess();
      } catch (error) {
        console.error('Lead submission failed:', error);
      }
    },
  });

  const addChild = (children: CreateLeadFormData['children']) => {
    const childrenCount = children.length;
    if (childrenCount < MAX_CHILDREN_COUNT) {
      form.setFieldValue('children', [...children, DEFAULT_CHILD_VALUE]);
    }
  };

  const removeChild = (
    children: CreateLeadFormData['children'],
    index: number,
  ) => {
    const childrenCount = children.length;
    if (childrenCount > MIN_CHILDREN_COUNT) {
      const newChildren = children.filter(
        (_, childIndex) => childIndex !== index,
      );
      form.setFieldValue('children', newChildren);
    }
  };

  const updateChild = (
    children: CreateLeadFormData['children'],
    index: number,
    childUpdate: Partial<CreateLeadFormData['children'][number]>,
  ) => {
    const nextChildren = [...children];
    const currentChild = nextChildren[index] ?? DEFAULT_CHILD_VALUE;
    nextChildren[index] = {
      ...currentChild,
      ...childUpdate,
    };
    form.setFieldValue('children', nextChildren);
  };

  return (
    <div className='bg-white rounded-lg border p-6'>
      <h3 className='text-xl font-bold mb-4'>Zgłoś dziecko na zajęcia</h3>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className='space-y-4'
      >
        <div className='space-y-4'>
          <h4 className='font-semibold text-gray-900'>Dane rodzica/opiekuna</h4>

          <form.Field name='name'>
            {(field) => {
              const error = field.state.meta.errors?.[0];
              const errorMessage =
                typeof error === 'string'
                  ? error
                  : (error as unknown as { message?: string })?.message;

              return (
                <div>
                  <label
                    htmlFor='name'
                    className='block text-sm font-medium mb-1'
                  >
                    Imię i nazwisko <span className='text-red-500'>*</span>
                  </label>
                  <input
                    id='name'
                    type='text'
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
                    aria-required='true'
                    aria-describedby={errorMessage ? 'name-error' : undefined}
                  />
                  {errorMessage && (
                    <p id='name-error' className='text-sm text-red-600 mt-1'>
                      {errorMessage}
                    </p>
                  )}
                </div>
              );
            }}
          </form.Field>

          <form.Field name='email'>
            {(field) => {
              const error = field.state.meta.errors?.[0];
              const errorMessage =
                typeof error === 'string'
                  ? error
                  : (error as unknown as { message?: string })?.message;

              return (
                <div>
                  <label
                    htmlFor='email'
                    className='block text-sm font-medium mb-1'
                  >
                    E-mail <span className='text-red-500'>*</span>
                  </label>
                  <input
                    id='email'
                    type='email'
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
                    aria-required='true'
                    aria-describedby={errorMessage ? 'email-error' : undefined}
                  />
                  {errorMessage && (
                    <p id='email-error' className='text-sm text-red-600 mt-1'>
                      {errorMessage}
                    </p>
                  )}
                </div>
              );
            }}
          </form.Field>

          <form.Field name='phone'>
            {(field) => {
              const error = field.state.meta.errors?.[0];
              const errorMessage =
                typeof error === 'string'
                  ? error
                  : (error as unknown as { message?: string })?.message;

              return (
                <div>
                  <label
                    htmlFor='phone'
                    className='block text-sm font-medium mb-1'
                  >
                    Telefon <span className='text-red-500'>*</span>
                  </label>
                  <input
                    id='phone'
                    type='tel'
                    placeholder='+48123456789'
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
                    aria-required='true'
                    aria-describedby={errorMessage ? 'phone-error' : undefined}
                  />
                  {errorMessage && (
                    <p id='phone-error' className='text-sm text-red-600 mt-1'>
                      {errorMessage}
                    </p>
                  )}
                </div>
              );
            }}
          </form.Field>

          <form.Field name='contact_preference'>
            {(field) => (
              <div>
                <label className='block text-sm font-medium mb-2'>
                  Preferowany sposób kontaktu{' '}
                  <span className='text-red-500'>*</span>
                </label>
                <div className='space-y-2'>
                  {(['email', 'phone', 'sms'] as const).map((pref) => (
                    <label key={pref} className='flex items-center gap-2'>
                      <input
                        type='radio'
                        name='contact_preference'
                        value={pref}
                        checked={field.state.value === pref}
                        onChange={() => field.handleChange(pref)}
                        className='w-4 h-4 text-primary'
                      />
                      <span className='text-sm'>
                        {pref === 'email'
                          ? 'E-mail'
                          : pref === 'phone'
                            ? 'Telefon'
                            : 'SMS'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </form.Field>
        </div>

        <form.Field name='children'>
          {(childrenField) => {
            const children = childrenField.state.value;
            const childrenCount = children.length;

            return (
              <div className='space-y-4 pt-4 border-t'>
                <div className='flex items-center justify-between'>
                  <h4 className='font-semibold text-gray-900'>
                    Dane dziecka/dzieci
                  </h4>
                  {childrenCount < MAX_CHILDREN_COUNT && (
                    <button
                      type='button'
                      onClick={() => addChild(children)}
                      className='px-3 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1 text-sm'
                    >
                      <Plus className='w-4 h-4' />
                      Dodaj dziecko
                    </button>
                  )}
                </div>

                {children.map((child, index) => (
                  <div
                    key={index}
                    className='bg-gray-50 p-4 rounded-lg space-y-3'
                  >
                    <div className='flex items-center justify-between'>
                      <h5 className='font-medium'>Dziecko {index + 1}</h5>
                      {childrenCount > MIN_CHILDREN_COUNT && (
                        <button
                          type='button'
                          onClick={() => removeChild(children, index)}
                          className='text-red-600 hover:text-red-700'
                          aria-label={`Usuń dziecko ${index + 1}`}
                        >
                          <Trash2 className='w-4 h-4' />
                        </button>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor={`child-name-${index}`}
                        className='block text-sm font-medium mb-1'
                      >
                        Imię dziecka <span className='text-red-500'>*</span>
                      </label>
                      <input
                        id={`child-name-${index}`}
                        type='text'
                        value={child.name}
                        onChange={(e) =>
                          updateChild(children, index, { name: e.target.value })
                        }
                        className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`child-age-${index}`}
                        className='block text-sm font-medium mb-1'
                      >
                        Wiek dziecka <span className='text-red-500'>*</span>
                      </label>
                      <input
                        id={`child-age-${index}`}
                        type='number'
                        min='1'
                        max='100'
                        value={child.age > 0 ? String(child.age) : ''}
                        onChange={(e) => {
                          const nextAge =
                            e.target.value === '' ? 0 : Number(e.target.value);
                          updateChild(children, index, {
                            age: Number.isNaN(nextAge) ? 0 : nextAge,
                          });
                        }}
                        className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          }}
        </form.Field>

        <form.Field name='additional_message'>
          {(field) => (
            <div>
              <label
                htmlFor='message'
                className='block text-sm font-medium mb-1'
              >
                Dodatkowa wiadomość (opcjonalnie)
              </label>
              <textarea
                id='message'
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                rows={3}
                maxLength={500}
                className='w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'
                placeholder='Możesz dodać dodatkowe informacje lub pytania...'
              />
              <p className='text-xs text-gray-500 mt-1'>
                {(field.state.value || '').length} / 500 znaków
              </p>
            </div>
          )}
        </form.Field>

        <div className='space-y-3 pt-4 border-t'>
          <form.Field name='consent_communication'>
            {(field) => (
              <label className='flex items-start gap-2'>
                <input
                  type='checkbox'
                  checked={field.state.value}
                  onChange={(e) => field.handleChange(e.target.checked)}
                  className='w-4 h-4 mt-1 text-primary'
                  aria-required='true'
                />
                <span className='text-sm'>
                  Wyrażam zgodę na kontakt w sprawie tej oferty{' '}
                  <span className='text-red-500'>*</span>
                </span>
              </label>
            )}
          </form.Field>

          <form.Field name='consent_marketing'>
            {(field) => (
              <label className='flex items-start gap-2'>
                <input
                  type='checkbox'
                  checked={field.state.value}
                  onChange={(e) => field.handleChange(e.target.checked)}
                  className='w-4 h-4 mt-1 text-primary'
                />
                <span className='text-sm'>
                  Wyrażam zgodę na otrzymywanie informacji marketingowych
                </span>
              </label>
            )}
          </form.Field>
        </div>

        <div className='flex gap-3 pt-4'>
          <button
            type='submit'
            disabled={createLeadMutation.isPending || !form.state.isValid}
            className='flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {createLeadMutation.isPending
              ? 'Wysyłanie...'
              : 'Wyślij zgłoszenie'}
          </button>
          <button
            type='button'
            onClick={onCancel}
            disabled={createLeadMutation.isPending}
            className='px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors'
          >
            Anuluj
          </button>
        </div>

        {createLeadMutation.isError && (
          <div className='bg-red-50 border border-red-200 rounded p-3'>
            <p className='text-sm text-red-800'>
              Wystąpił błąd podczas wysyłania zgłoszenia. Spróbuj ponownie.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
