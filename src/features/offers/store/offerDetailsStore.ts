import { create } from 'zustand';

interface OfferDetailsState {
  showLeadForm: boolean;
  leadSubmitted: boolean;
  currentImageIndex: number;
  lightboxOpen: boolean;

  setShowLeadForm: (show: boolean) => void;
  setLeadSubmitted: (submitted: boolean) => void;
  setCurrentImageIndex: (index: number) => void;
  setLightboxOpen: (open: boolean) => void;
  resetState: () => void;
}

export const useOfferDetailsStore = create<OfferDetailsState>((set) => ({
  showLeadForm: false,
  leadSubmitted: false,
  currentImageIndex: 0,
  lightboxOpen: false,

  setShowLeadForm: (show) => set({ showLeadForm: show }),
  setLeadSubmitted: (submitted) => set({ leadSubmitted: submitted }),
  setCurrentImageIndex: (index) => set({ currentImageIndex: index }),
  setLightboxOpen: (open) => set({ lightboxOpen: open }),
  resetState: () =>
    set({
      showLeadForm: false,
      leadSubmitted: false,
      currentImageIndex: 0,
      lightboxOpen: false,
    }),
}));
