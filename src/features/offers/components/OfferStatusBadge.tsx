import type { OfferStatus } from '../types';

interface OfferStatusBadgeProps {
  status: OfferStatus;
}

const STATUS_CONFIG: Record<OfferStatus, { label: string; className: string }> =
  {
    draft: {
      label: 'Szkic',
      className: 'bg-gray-100 text-gray-800',
    },
    pending_review: {
      label: 'Oczekuje',
      className: 'bg-yellow-100 text-yellow-800',
    },
    published: {
      label: 'Opublikowana',
      className: 'bg-green-100 text-green-800',
    },
    rejected: {
      label: 'Odrzucona',
      className: 'bg-red-100 text-red-800',
    },
    archived: {
      label: 'Archiwalna',
      className: 'bg-gray-100 text-gray-600',
    },
  };

export function OfferStatusBadge({ status }: OfferStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
