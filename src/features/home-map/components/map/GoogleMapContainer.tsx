import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { X } from 'lucide-react';
import type { PublicOfferListItemDto } from '@/types';
import { OfferQuickPreview } from './OfferQuickPreview';
import {
  DEFAULT_MAP_CENTER,
  createMarkerIcon,
  getBoundsForOffers,
  MARKER_ZOOM,
} from '../../utils/map-helpers';
import { Button } from '@/components/ui/button';

interface GoogleMapContainerProps {
  offers: PublicOfferListItemDto[];
  center: google.maps.LatLngLiteral | null;
  selectedOfferId: string | null;
  hoveredOfferId: string | null;
  fitBoundsKey: string;
  onOfferSelect: (offerId: string | null) => void;
}

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
};

const DEFAULT_ZOOM = 12;

export function GoogleMapContainer({
  offers,
  center,
  selectedOfferId,
  hoveredOfferId,
  fitBoundsKey,
  onOfferSelect,
}: GoogleMapContainerProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markerClustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const markerByOfferIdRef = useRef<Record<string, google.maps.Marker>>({});
  const lastFitBoundsKeyRef = useRef<string>('');
  const hasUserDraggedRef = useRef(false);
  const selectedOfferIdRef = useRef<string | null>(selectedOfferId);
  const hoveredOfferIdRef = useRef<string | null>(hoveredOfferId);
  const isDrawingRef = useRef(false);
  const startLatLngRef = useRef<google.maps.LatLng | null>(null);
  const rectangleRef = useRef<google.maps.Rectangle | null>(null);
  const drawListenersRef = useRef<google.maps.MapsEventListener[]>([]);

  const selectedOffer = useMemo(() => {
    if (!selectedOfferId) {
      return null;
    }

    return offers.find((offer) => offer.id === selectedOfferId) || null;
  }, [offers, selectedOfferId]);

  const updateMarkerStates = useCallback(() => {
    Object.entries(markerByOfferIdRef.current).forEach(([offerId, marker]) => {
      const isSelected = offerId === selectedOfferIdRef.current;
      const isHovered = !isSelected && offerId === hoveredOfferIdRef.current;
      const state = isSelected ? 'selected' : isHovered ? 'hover' : 'default';
      marker.setIcon(createMarkerIcon(state));
      marker.setAnimation(isSelected ? google.maps.Animation.BOUNCE : null);
      marker.setZIndex(
        isSelected ? google.maps.Marker.MAX_ZINDEX + 1 : undefined,
      );
    });
  }, []);

  useEffect(() => {
    selectedOfferIdRef.current = selectedOfferId;
    hoveredOfferIdRef.current = hoveredOfferId;
    updateMarkerStates();
  }, [hoveredOfferId, selectedOfferId, updateMarkerStates]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    if (markerClustererRef.current) {
      markerClustererRef.current.clearMarkers();
    }
    setMap(null);
  }, []);

  useEffect(() => {
    if (!map) return;

    if (markerClustererRef.current) {
      markerClustererRef.current.clearMarkers();
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    markerByOfferIdRef.current = {};

    const markers = offers
      .map((offer) => {
        if (!offer.location?.coordinates) {
          return null;
        }

        const [lng, lat] = offer.location.coordinates;
        const marker = new google.maps.Marker({
          position: { lat, lng },
          title: offer.title,
          icon: createMarkerIcon('default'),
        });

        marker.addListener('click', () => {
          onOfferSelect(offer.id);
        });

        markerByOfferIdRef.current[offer.id] = marker;

        return marker;
      })
      .filter((marker): marker is google.maps.Marker => marker !== null);

    markersRef.current = markers;

    markerClustererRef.current = new MarkerClusterer({
      map,
      markers,
      algorithmOptions: {
        maxZoom: 15,
      },
    });

    if (offers.length > 0 && !hasUserDraggedRef.current) {
      const bounds = getBoundsForOffers(offers);
      if (bounds) {
        map.fitBounds(bounds);
      }
    }
    updateMarkerStates();
  }, [map, offers, onOfferSelect, updateMarkerStates]);

  useEffect(() => {
    if (!map) {
      return;
    }

    if (fitBoundsKey !== lastFitBoundsKeyRef.current) {
      lastFitBoundsKeyRef.current = fitBoundsKey;
      hasUserDraggedRef.current = false;
      if (rectangleRef.current) {
        rectangleRef.current.setMap(null);
        rectangleRef.current = null;
      }
    }
  }, [fitBoundsKey, map]);

  useEffect(() => {
    if (!map || !center) return;
    map.panTo(center);
  }, [map, center]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const listener = map.addListener('click', () => {
      onOfferSelect(null);
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onOfferSelect]);

  useEffect(() => {
    if (!map || !selectedOffer?.location?.coordinates) {
      return;
    }

    const [lng, lat] = selectedOffer.location.coordinates;
    map.panTo({ lat, lng });
    map.setZoom(MARKER_ZOOM);
  }, [map, selectedOffer]);

  const handleClosePreview = useCallback(() => {
    onOfferSelect(null);
  }, [onOfferSelect]);

  const handleClearBounds = useCallback(() => {
    if (rectangleRef.current) {
      rectangleRef.current.setMap(null);
      rectangleRef.current = null;
    }

    hasUserDraggedRef.current = false;
    onOfferSelect(null);

    if (map && offers.length > 0) {
      const bounds = getBoundsForOffers(offers);
      if (bounds) {
        map.fitBounds(bounds);
      }
    }
  }, [map, offers, onOfferSelect]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const dragListener = map.addListener('dragstart', () => {
      hasUserDraggedRef.current = true;
    });

    return () => {
      google.maps.event.removeListener(dragListener);
    };
  }, [map]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const clearDrawListeners = () => {
      drawListenersRef.current.forEach((listener) =>
        google.maps.event.removeListener(listener),
      );
      drawListenersRef.current = [];
    };

    const handleMouseDown = (event: google.maps.MapMouseEvent) => {
      const mouseEvent = event.domEvent as MouseEvent | undefined;
      if (!event.latLng || !mouseEvent?.shiftKey) {
        return;
      }

      isDrawingRef.current = true;
      startLatLngRef.current = event.latLng;
      map.setOptions({ draggable: false });

      if (rectangleRef.current) {
        rectangleRef.current.setMap(null);
        rectangleRef.current = null;
      }

      rectangleRef.current = new google.maps.Rectangle({
        map,
        bounds: new google.maps.LatLngBounds(event.latLng, event.latLng),
        strokeColor: '#60a5fa',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#bae6fd',
        fillOpacity: 0.2,
        draggable: true,
        editable: true,
      });

      hasUserDraggedRef.current = true;
    };

    const handleMouseMove = (event: google.maps.MapMouseEvent) => {
      if (!isDrawingRef.current || !startLatLngRef.current || !event.latLng) {
        return;
      }

      const bounds = new google.maps.LatLngBounds(
        startLatLngRef.current,
        event.latLng,
      );
      rectangleRef.current?.setBounds(bounds);
    };

    const handleMouseUp = () => {
      if (!isDrawingRef.current) {
        return;
      }

      isDrawingRef.current = false;
      startLatLngRef.current = null;
      map.setOptions({ draggable: true });
    };

    const listeners = [
      map.addListener('mousedown', handleMouseDown),
      map.addListener('mousemove', handleMouseMove),
      map.addListener('mouseup', handleMouseUp),
    ];

    drawListenersRef.current = listeners;

    return () => {
      clearDrawListeners();
    };
  }, [map]);

  return (
    <div className='relative h-full w-full'>
      <div className='absolute right-14 top-4 z-10'>
        <Button
          type='button'
          variant='secondary'
          size='sm'
          onClick={handleClearBounds}
          className='gap-2 shadow-sm'
        >
          <X className='h-4 w-4' />
          Wyczyść
        </Button>
      </div>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center || DEFAULT_MAP_CENTER}
        zoom={DEFAULT_ZOOM}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      />

      {selectedOffer && (
        <OfferQuickPreview offer={selectedOffer} onClose={handleClosePreview} />
      )}
    </div>
  );
}
