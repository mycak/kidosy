import type { LeadStatus, OfferStatus } from '@/types';

export type OrganizerDashboardSummary = {
  draftCount: number;
  pendingReviewCount: number;
  publishedCount: number;
  rejectedCount: number;
  archivedCount: number;
  totalOffers: number;
  totalLeads: number;
};

export type OrganizerOfferListItem = {
  id: string;
  title: string;
  status: OfferStatus;
  availableSpots: number;
  startDate: string;
  endDate: string;
  updatedAt: string;
  rejectionReason: string | null;
  offerTypeName: string;
  leadsCount: number;
};

export type OrganizerOffersSortBy =
  | 'updated_at'
  | 'created_at'
  | 'title'
  | 'start_date'
  | 'leads_count';

export type OrganizerLeadsSortBy = 'created_at' | 'child_name' | 'parent_name';

export type SortOrder = 'asc' | 'desc';

export type OrganizerPagination = {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type OrganizerPaginatedResult<TData> = {
  data: TData[];
  pagination: OrganizerPagination;
};

export type OrganizerDashboardData = {
  summary: OrganizerDashboardSummary;
  recentOffers: OrganizerOfferListItem[];
};

export type OrganizerLeadListItem = {
  id: string;
  offerId: string;
  offerTitle: string;
  childName: string;
  childAge: number;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  message: string | null;
  status: LeadStatus;
  createdAt: string;
};

export type OrganizerProfileData = {
  companyName: string;
  phone: string;
  emailPublic: string;
};

export type OrganizerOffersQueryOptions = {
  status: OfferStatus | 'all';
  sortBy: OrganizerOffersSortBy;
  sortOrder: SortOrder;
  page: number;
  perPage: number;
};

export type OrganizerLeadsQueryOptions = {
  status: LeadStatus | 'all';
  sortBy: OrganizerLeadsSortBy;
  sortOrder: SortOrder;
  page: number;
  perPage: number;
};

export type OrganizerOfferFormValues = {
  title: string;
  description: string;
  offerTypeId: string;
  categoryIds: string[];
  minAge: number;
  maxAge: number;
  address: string;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  availableSpots: number;
  status: OfferStatus;
};
