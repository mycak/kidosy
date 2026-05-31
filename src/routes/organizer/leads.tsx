import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Filter,
  MessagesSquare,
  Sparkles,
} from 'lucide-react';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthSession } from '@/features/auth/context/useAuthSession';
import {
  useOrganizerLeadsQueryWithOptions,
  useUpdateOrganizerLeadStatusMutation,
} from '@/features/organizer/api/organizer.queries';
import type {
  OrganizerLeadsSortBy,
  SortOrder,
} from '@/features/organizer/api/organizer.types';
import { OrganizerToast } from '@/features/organizer/components/common/OrganizerToast';
import type { LeadStatus } from '@/types';

const leadsSearchParamsSchema = z.object({
  status: z
    .enum(['all', 'submitted', 'contacted', 'completed', 'cancelled'])
    .default('all'),
  sortBy: z
    .enum(['created_at', 'child_name', 'parent_name'])
    .default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
});

export const Route = createFileRoute('/organizer/leads')({
  component: OrganizerLeadsRoute,
  validateSearch: leadsSearchParamsSchema.parse,
});

const LEAD_STATUS_FILTERS: readonly (LeadStatus | 'all')[] = [
  'all',
  'submitted',
  'contacted',
  'completed',
  'cancelled',
] as const;

const LEAD_STATUS_LABELS = {
  all: 'Wszystkie',
  submitted: 'Nowe',
  contacted: 'W kontakcie',
  completed: 'Zakończone',
  cancelled: 'Anulowane',
} as const;

const LEAD_SORT_OPTIONS = [
  { value: 'created_at', label: 'Najnowsze zgłoszenia' },
  { value: 'child_name', label: 'Imię dziecka (A-Z)' },
  { value: 'parent_name', label: 'Imię rodzica (A-Z)' },
] as const satisfies ReadonlyArray<{
  value: OrganizerLeadsSortBy;
  label: string;
}>;

const ITEMS_PER_PAGE = 10;
const TOAST_AUTO_CLOSE_TIMEOUT_MS = 3000;

type OrganizerToastState = {
  message: string;
  variant: 'success' | 'error';
};

function OrganizerLeadsRoute() {
  const { user } = useAuthSession();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const updateLeadStatusMutation = useUpdateOrganizerLeadStatusMutation(
    user?.id,
  );

  const selectedStatus = search.status as LeadStatus | 'all';
  const sortBy = search.sortBy as OrganizerLeadsSortBy;
  const sortOrder = search.sortOrder as SortOrder;
  const page = search.page;
  const [draftStatusesByLeadId, setDraftStatusesByLeadId] = useState<
    Record<string, LeadStatus>
  >({});
  const [toast, setToast] = useState<OrganizerToastState | null>(null);

  const leadsQuery = useOrganizerLeadsQueryWithOptions(user?.id, {
    status: selectedStatus,
    sortBy,
    sortOrder,
    page,
    perPage: ITEMS_PER_PAGE,
  });

  const leads = useMemo(() => leadsQuery.data?.data ?? [], [leadsQuery.data]);
  const pagination = leadsQuery.data?.pagination;

  const updateSearch = (
    updater: (currentSearch: typeof search) => typeof search,
  ) => {
    void navigate({
      search: (previousSearch) => updater(previousSearch as typeof search),
      replace: true,
    });
  };

  useEffect(() => {
    if (!toast) {
      return;
    }

    const closeToastTimeout = window.setTimeout(() => {
      setToast(null);
    }, TOAST_AUTO_CLOSE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(closeToastTimeout);
    };
  }, [toast]);

  const handleLeadStatusDraftChange = (leadId: string, status: LeadStatus) => {
    setDraftStatusesByLeadId((previousValue) => ({
      ...previousValue,
      [leadId]: status,
    }));
  };

  const handleLeadStatusSave = async (
    leadId: string,
    currentStatus: LeadStatus,
  ) => {
    const nextStatus = draftStatusesByLeadId[leadId] ?? currentStatus;

    if (nextStatus === currentStatus) {
      return;
    }

    try {
      await updateLeadStatusMutation.mutateAsync({
        leadId,
        status: nextStatus,
      });

      setToast({
        variant: 'success',
        message: 'Status zgłoszenia został zapisany.',
      });
    } catch {
      setToast({
        variant: 'error',
        message: 'Nie udało się zapisać statusu zgłoszenia.',
      });
    }
  };

  if (!user) {
    return (
      <p className='text-sm text-muted-foreground'>
        Brak aktywnej sesji użytkownika.
      </p>
    );
  }

  if (leadsQuery.isLoading) {
    return (
      <p className='text-sm text-muted-foreground'>Ładowanie zgłoszeń...</p>
    );
  }

  if (leadsQuery.isError) {
    return (
      <p className='text-sm text-destructive'>Nie udało się pobrać zgłoszeń.</p>
    );
  }

  return (
    <section className='flex flex-1 flex-col gap-4'>
      <header className='ui-entrance ui-panel flex flex-col gap-3 rounded-[28px] p-5'>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='secondary' className='gap-1.5 rounded-full px-3 py-1'>
            <Sparkles className='size-3' />
            lead center
          </Badge>
          <Badge variant='outline' className='gap-1.5 rounded-full px-3 py-1'>
            <MessagesSquare className='size-3' />
            szybka obsługa
          </Badge>
        </div>
        <div>
          <h1 className='text-3xl font-semibold tracking-tight'>Zgłoszenia</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Przeglądaj i aktualizuj status zgłoszeń rodziców.
          </p>
        </div>
      </header>

      <div className='ui-panel flex flex-wrap gap-3 rounded-[24px] p-4'>
        <label className='flex w-full max-w-xs flex-col gap-1'>
          <span className='inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            <Filter className='size-3.5' />
            Filtr statusu
          </span>
          <select
            value={selectedStatus}
            onChange={(event) => {
              updateSearch((currentSearch) => ({
                ...currentSearch,
                status: event.target.value as LeadStatus | 'all',
                page: 1,
              }));
            }}
            className='h-9 rounded-md border bg-background px-3 text-sm'
          >
            {LEAD_STATUS_FILTERS.map((leadStatusFilter) => (
              <option key={leadStatusFilter} value={leadStatusFilter}>
                {LEAD_STATUS_LABELS[leadStatusFilter]}
              </option>
            ))}
          </select>
        </label>

        <label className='flex w-full max-w-xs flex-col gap-1'>
          <span className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Sortowanie
          </span>
          <select
            value={sortBy}
            onChange={(event) => {
              updateSearch((currentSearch) => ({
                ...currentSearch,
                sortBy: event.target.value as OrganizerLeadsSortBy,
                page: 1,
              }));
            }}
            className='h-9 rounded-md border bg-background px-3 text-sm'
          >
            {LEAD_SORT_OPTIONS.map((sortOption) => (
              <option key={sortOption.value} value={sortOption.value}>
                {sortOption.label}
              </option>
            ))}
          </select>
        </label>

        <label className='flex w-full max-w-40 flex-col gap-1'>
          <span className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Kierunek
          </span>
          <select
            value={sortOrder}
            onChange={(event) => {
              updateSearch((currentSearch) => ({
                ...currentSearch,
                sortOrder: event.target.value as SortOrder,
                page: 1,
              }));
            }}
            className='h-9 rounded-md border bg-background px-3 text-sm'
          >
            <option value='desc'>malejąco</option>
            <option value='asc'>rosnąco</option>
          </select>
        </label>
      </div>

      {leads.length === 0 ? (
        <div className='ui-panel rounded-[24px] border-dashed p-5 text-sm text-muted-foreground'>
          <p className='font-medium text-foreground'>
            Brak zgłoszeń dla wybranego filtra.
          </p>
          <p className='mt-2 max-w-2xl leading-6'>
            Zmień filtr statusu albo poczekaj na nowe zgłoszenia — tutaj szybko
            zobaczysz, co wymaga reakcji.
          </p>
        </div>
      ) : (
        <div className='overflow-x-auto rounded-[24px] border border-white/70 bg-white/70 shadow-sm backdrop-blur-xl'>
          <table className='min-w-full divide-y text-sm'>
            <thead>
              <tr className='bg-muted/50 text-left'>
                <th className='px-3 py-2 font-medium'>Dziecko</th>
                <th className='px-3 py-2 font-medium'>Rodzic</th>
                <th className='px-3 py-2 font-medium'>Oferta</th>
                <th className='px-3 py-2 font-medium'>Status</th>
                <th className='px-3 py-2 font-medium'>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((leadItem) => {
                const draftStatus =
                  draftStatusesByLeadId[leadItem.id] ?? leadItem.status;

                return (
                  <tr
                    key={leadItem.id}
                    className='border-t transition-colors hover:bg-white/70'
                  >
                    <td className='px-3 py-2'>
                      <p className='font-medium'>{leadItem.childName}</p>
                      <p className='text-xs text-muted-foreground'>
                        Wiek: {leadItem.childAge}
                      </p>
                    </td>
                    <td className='px-3 py-2'>
                      <p>{leadItem.parentName}</p>
                      <p className='text-xs text-muted-foreground'>
                        {leadItem.parentEmail}
                      </p>
                    </td>
                    <td className='px-3 py-2'>{leadItem.offerTitle}</td>
                    <td className='px-3 py-2'>
                      <select
                        value={draftStatus}
                        onChange={(event) =>
                          handleLeadStatusDraftChange(
                            leadItem.id,
                            event.target.value as LeadStatus,
                          )
                        }
                        className='h-8 rounded-md border bg-background px-2 text-xs'
                      >
                        <option value='submitted'>
                          {LEAD_STATUS_LABELS.submitted}
                        </option>
                        <option value='contacted'>
                          {LEAD_STATUS_LABELS.contacted}
                        </option>
                        <option value='completed'>
                          {LEAD_STATUS_LABELS.completed}
                        </option>
                        <option value='cancelled'>
                          {LEAD_STATUS_LABELS.cancelled}
                        </option>
                      </select>
                    </td>
                    <td className='px-3 py-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={
                          updateLeadStatusMutation.isPending ||
                          draftStatus === leadItem.status
                        }
                        onClick={() =>
                          void handleLeadStatusSave(
                            leadItem.id,
                            leadItem.status,
                          )
                        }
                      >
                        <CheckCircle2 className='size-3.5' />
                        Zapisz
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination ? (
        <div className='flex items-center justify-between gap-3 rounded-[24px] border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur-xl'>
          <p className='text-xs text-muted-foreground'>
            Strona {pagination.page} z {Math.max(1, pagination.totalPages)} (
            {pagination.total} wyników)
          </p>

          <div className='flex gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() =>
                updateSearch((currentSearch) => ({
                  ...currentSearch,
                  page: Math.max(1, currentSearch.page - 1),
                }))
              }
              disabled={page <= 1}
            >
              <ArrowLeft className='size-3.5' />
              Poprzednia
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() =>
                updateSearch((currentSearch) => ({
                  ...currentSearch,
                  page: currentSearch.page + 1,
                }))
              }
              disabled={page >= (pagination.totalPages || 1)}
            >
              Następna
              <ArrowRight className='size-3.5' />
            </Button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <OrganizerToast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
    </section>
  );
}
