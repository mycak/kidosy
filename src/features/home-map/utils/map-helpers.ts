import type { PublicOfferListItemDto } from '@/types';

export const DEFAULT_MAP_CENTER = {
  lat: 52.2297,
  lng: 21.0122,
};

export const DEFAULT_MAP_ZOOM = 12;
export const LOCATION_ZOOM = 13;
export const MARKER_ZOOM = 15;

type MarkerState = 'default' | 'hover' | 'selected';

const MARKER_SIZES: Record<MarkerState, { width: number; height: number }> = {
  default: { width: 34, height: 44 },
  hover: { width: 38, height: 48 },
  selected: { width: 40, height: 52 },
};

const MARKER_COLORS: Record<MarkerState, { fill: string; stroke: string }> = {
  default: { fill: '#93c5fd', stroke: '#60a5fa' },
  hover: { fill: '#fbcfe8', stroke: '#f472b6' },
  selected: { fill: '#a7f3d0', stroke: '#34d399' },
};

const MARKER_VIEWBOX = '0 0 48 64';

const buildMarkerSvg = (fill: string, stroke: string) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="${MARKER_VIEWBOX}">
    <path fill="${fill}" stroke="${stroke}" stroke-width="3" d="M24 2C12.402 2 3 11.402 3 23c0 11.598 21 39 21 39s21-27.402 21-39C45 11.402 35.598 2 24 2z"/>
    <circle cx="24" cy="24" r="9" fill="white"/>
  </svg>
`;

export function createMarkerIcon(state: MarkerState): google.maps.Icon {
  const { width, height } = MARKER_SIZES[state];
  const { fill, stroke } = MARKER_COLORS[state];

  return {
    url:
      'data:image/svg+xml;charset=UTF-8,' +
      encodeURIComponent(buildMarkerSvg(fill, stroke)),
    scaledSize: new google.maps.Size(width, height),
    anchor: new google.maps.Point(width / 2, height),
  };
}

export function getBoundsForOffers(
  offers: PublicOfferListItemDto[],
): google.maps.LatLngBounds | null {
  if (offers.length === 0) {
    return null;
  }

  const bounds = new google.maps.LatLngBounds();

  offers.forEach((offer) => {
    if (offer.location?.coordinates) {
      const [lng, lat] = offer.location.coordinates;
      bounds.extend(new google.maps.LatLng(lat, lng));
    }
  });

  return bounds;
}

export function getMapCenter(
  offers: PublicOfferListItemDto[],
  userLocation: { lat: number; lon: number } | null,
): google.maps.LatLngLiteral {
  if (userLocation) {
    return { lat: userLocation.lat, lng: userLocation.lon };
  }

  if (offers.length > 0 && offers[0].location?.coordinates) {
    const [lng, lat] = offers[0].location.coordinates;
    return { lat, lng };
  }

  return DEFAULT_MAP_CENTER;
}
