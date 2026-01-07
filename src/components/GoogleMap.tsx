import { useCallback, useState, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { MapPin, User, Plane, Camera } from 'lucide-react';

interface MemberLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
  user?: { name: string; avatar_url?: string };
}

interface ActivityLocation {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  type: 'travel' | 'activity' | 'meal' | 'accommodation' | 'free_time' | 'meeting' | 'media';
  start_time?: string;
  isRevealed?: boolean;
}

interface GoogleMapComponentProps {
  memberLocations?: MemberLocation[];
  activityLocations?: ActivityLocation[];
  showRoute?: boolean;
  center?: { lat: number; lng: number };
  zoom?: number;
  isAdmin?: boolean;
  height?: string;
  onMarkerClick?: (location: ActivityLocation | MemberLocation) => void;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 52.3676, // Amsterdam
  lng: 4.9041,
};

// Dark theme map style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  {
    featureType: 'administrative.country',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#4b6878' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64779e' }],
  },
  {
    featureType: 'administrative.province',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#4b6878' }],
  },
  {
    featureType: 'landscape.man_made',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#334e87' }],
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#023e58' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#283d6a' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6f9ba5' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1d2c4d' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry.fill',
    stylers: [{ color: '#023e58' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#3C7680' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#304a7d' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#98a5be' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1d2c4d' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2c6675' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#255763' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b0d5ce' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#023e58' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#98a5be' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1d2c4d' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry.fill',
    stylers: [{ color: '#283d6a' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: '#3a4762' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e1626' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4e6d70' }],
  },
];

// Activity type colors
const activityColors: Record<string, string> = {
  travel: '#3b82f6', // blue
  activity: '#d946ef', // fuchsia
  meal: '#f97316', // orange
  accommodation: '#a855f7', // purple
  free_time: '#22c55e', // green
  meeting: '#eab308', // yellow
  media: '#14b8a6', // teal
};

export default function GoogleMapComponent({
  memberLocations = [],
  activityLocations = [],
  showRoute = false,
  center,
  zoom = 12,
  isAdmin = false,
  height = '400px',
  onMarkerClick,
}: GoogleMapComponentProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberLocation | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLocation | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Calculate center from locations if not provided
  const mapCenter = center || (memberLocations.length > 0
    ? { lat: memberLocations[0].latitude, lng: memberLocations[0].longitude }
    : activityLocations.length > 0
      ? { lat: activityLocations[0].latitude, lng: activityLocations[0].longitude }
      : defaultCenter);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMap(map);

    // Fit bounds to show all markers
    if (memberLocations.length > 0 || activityLocations.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();

      memberLocations.forEach(loc => {
        bounds.extend({ lat: loc.latitude, lng: loc.longitude });
      });

      activityLocations.forEach(loc => {
        if (loc.isRevealed !== false) {
          bounds.extend({ lat: loc.latitude, lng: loc.longitude });
        }
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, 50);
      }
    }
  }, [memberLocations, activityLocations]);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    setMap(null);
  }, []);

  // Update bounds when locations change
  useEffect(() => {
    if (map && (memberLocations.length > 0 || activityLocations.length > 0)) {
      const bounds = new window.google.maps.LatLngBounds();

      memberLocations.forEach(loc => {
        bounds.extend({ lat: loc.latitude, lng: loc.longitude });
      });

      activityLocations.filter(loc => loc.isRevealed !== false || isAdmin).forEach(loc => {
        bounds.extend({ lat: loc.latitude, lng: loc.longitude });
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, 50);
      }
    }
  }, [map, memberLocations, activityLocations, isAdmin]);

  // Route path for activities
  const routePath = showRoute
    ? activityLocations
        .filter(loc => loc.isRevealed !== false || isAdmin)
        .sort((a, b) => new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime())
        .map(loc => ({ lat: loc.latitude, lng: loc.longitude }))
    : [];

  if (loadError) {
    return (
      <div
        className="flex items-center justify-center bg-slate-800 rounded-xl"
        style={{ height }}
      >
        <div className="text-center p-8">
          <MapPin className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-200">Failed to load Google Maps</p>
          <p className="text-sm text-white/50 mt-2">Please check your API key</p>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div
        className="flex items-center justify-center bg-slate-800 rounded-xl"
        style={{ height }}
      >
        <div className="text-center p-8">
          <MapPin className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-2">Google Maps API Key Required</p>
          <p className="text-sm text-white/40">
            Add VITE_GOOGLE_MAPS_API_KEY to your environment variables
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center bg-slate-800 rounded-xl animate-pulse"
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: darkMapStyle,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        {/* Route polyline */}
        {showRoute && routePath.length > 1 && (
          <Polyline
            path={routePath}
            options={{
              strokeColor: '#d946ef',
              strokeOpacity: 0.8,
              strokeWeight: 3,
              geodesic: true,
            }}
          />
        )}

        {/* Member location markers */}
        {memberLocations.map((member) => (
          <Marker
            key={member.user_id}
            position={{ lat: member.latitude, lng: member.longitude }}
            onClick={() => {
              setSelectedMember(member);
              setSelectedActivity(null);
              onMarkerClick?.(member);
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            }}
          />
        ))}

        {/* Activity location markers */}
        {activityLocations.map((activity) => {
          // Don't show unrevealed activities for non-admins
          if (activity.isRevealed === false && !isAdmin) {
            return null;
          }

          return (
            <Marker
              key={activity.id}
              position={{ lat: activity.latitude, lng: activity.longitude }}
              onClick={() => {
                setSelectedActivity(activity);
                setSelectedMember(null);
                onMarkerClick?.(activity);
              }}
              icon={{
                path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 8,
                fillColor: activityColors[activity.type] || '#ffffff',
                fillOpacity: activity.isRevealed === false ? 0.5 : 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }}
            />
          );
        })}

        {/* Member info window */}
        {selectedMember && (
          <InfoWindow
            position={{ lat: selectedMember.latitude, lng: selectedMember.longitude }}
            onCloseClick={() => setSelectedMember(null)}
          >
            <div className="p-2 min-w-[150px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">
                  {selectedMember.user?.avatar_url || <User className="w-4 h-4" />}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {selectedMember.user?.name || 'Member'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Last updated: {new Date(selectedMember.updated_at).toLocaleTimeString()}
              </p>
            </div>
          </InfoWindow>
        )}

        {/* Activity info window */}
        {selectedActivity && (
          <InfoWindow
            position={{ lat: selectedActivity.latitude, lng: selectedActivity.longitude }}
            onCloseClick={() => setSelectedActivity(null)}
          >
            <div className="p-2 min-w-[180px]">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: activityColors[selectedActivity.type] }}
                >
                  {selectedActivity.type === 'travel' ? (
                    <Plane className="w-4 h-4" />
                  ) : selectedActivity.type === 'media' ? (
                    <Camera className="w-4 h-4" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedActivity.title}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {selectedActivity.type.replace('_', ' ')}
                  </p>
                </div>
              </div>
              {selectedActivity.start_time && (
                <p className="text-xs text-gray-500">
                  {new Date(selectedActivity.start_time).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
