import { useEffect, useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "@/lib/api";

interface AlumniLocation {
  city: string;
  country: string;
  lat: number;
  lng: number;
  count?: number;
}

// Component to track zoom changes
function ZoomTracker({ setZoom }: { setZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
    },
  });
  return null;
}

const AlumniMap = () => {
  const [locations, setLocations] = useState<AlumniLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(2);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data } = await api.get("/alumni-map");
        setLocations(data.locations || []);
      } catch (err) {
        console.error("Error fetching alumni locations:", err);
        setError("Failed to load alumni map");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const clusteredLocations = useMemo(() => {
    const clusters: Map<string, AlumniLocation> = new Map();

    if (currentZoom < 4) {
      // Country-level clustering: Track cities per country to find max
      const countryData: Map<
        string,
        { cities: AlumniLocation[]; totalCount: number }
      > = new Map();

      locations.forEach((loc) => {
        const countryKey = loc.country.toLowerCase();
        if (!countryData.has(countryKey)) {
          countryData.set(countryKey, { cities: [], totalCount: 0 });
        }
        const data = countryData.get(countryKey)!;
        data.cities.push(loc);
        data.totalCount += 1;
      });

      // For each country, place marker at city with most alumni
      countryData.forEach((data, countryKey) => {
        const cityWithMax = data.cities.reduce((max, city) => {
          const cityCount = data.cities.filter(
            (c) => c.city === city.city,
          ).length;
          const maxCount = data.cities.filter(
            (c) => c.city === max.city,
          ).length;
          return cityCount > maxCount ? city : max;
        });

        clusters.set(countryKey, {
          ...cityWithMax,
          count: data.totalCount,
        });
      });
    } else {
      // City-level clustering (zoom >= 5)
      locations.forEach((loc) => {
        const key = `${loc.city.toLowerCase()}-${loc.country.toLowerCase()}`;
        if (clusters.has(key)) {
          const existing = clusters.get(key)!;
          existing.count = (existing.count || 1) + 1;
        } else {
          clusters.set(key, { ...loc, count: 1 });
        }
      });
    }

    return Array.from(clusters.values());
  }, [locations, currentZoom]);

  if (isLoading) {
    return (
      <div className="relative py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
              Alumni Network Map
            </h2>
          </div>
          <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
              Alumni Network Map
            </h2>
          </div>
          <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="relative py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
              Alumni Network Map
            </h2>
          </div>
          <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-600">No alumni locations available yet</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative py-12 md:py-20 bg-white">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <div className="inline-block mb-3">
            <span className="text-nsut-maroon text-xs md:text-sm font-semibold tracking-wider uppercase">
              Our Network
            </span>
          </div>
          <h2 className="text-2xl md:text-4xl font-serif font-bold text-gray-900 mb-4">
            Alumni Network Map
          </h2>
          <p className="text-base md:text-lg text-gray-600 leading-relaxed">
            Discover where our alumni are located around the world
          </p>
        </div>

        <div className="w-full h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-lg">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            minZoom={2}
            maxZoom={18}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <ZoomTracker setZoom={setCurrentZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {clusteredLocations.map((cluster, idx) => {
              const radius = Math.min(8 + (cluster.count || 1) * 2, 30);
              const opacity = Math.min(0.3 + (cluster.count || 1) * 0.15, 0.95);
              return (
                <CircleMarker
                  key={idx}
                  center={[cluster.lat, cluster.lng]}
                  radius={radius}
                  fillColor="#ef4444"
                  color="#991b1b"
                  weight={2}
                  fillOpacity={opacity}
                >
                  <Popup>
                    <div className="text-sm md:text-base">
                      {currentZoom < 4 ? (
                        <strong>{cluster.country}</strong>
                      ) : (
                        <>
                          <strong>{cluster.city}</strong>
                          <br />
                          {cluster.country}
                        </>
                      )}
                      <br />
                      <span className="text-xs md:text-sm text-gray-600">
                        {cluster.count} alumni
                      </span>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default AlumniMap;
