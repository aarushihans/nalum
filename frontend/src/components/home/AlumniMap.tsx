import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "@/lib/api";

interface AlumniLocation {
  city: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  count?: number;
}

const AlumniMap = () => {
  const [locations, setLocations] = useState<AlumniLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    locations.forEach((loc) => {
      const key = `${loc.city.toLowerCase()}-${loc.country.toLowerCase()}`;
      if (clusters.has(key)) {
        const existing = clusters.get(key)!;
        existing.count = (existing.count || 1) + 1;
      } else {
        clusters.set(key, { ...loc, count: 1 });
      }
    });
    return Array.from(clusters.values());
  }, [locations]);

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

        <div className="w-full h-[500px] rounded-lg overflow-hidden shadow-lg">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {clusteredLocations.map((cluster, idx) => {
              const radius = Math.min(8 + (cluster.count || 1) * 2, 30);
              const opacity = Math.min(0.4 + (cluster.count || 1) * 0.1, 0.9);
              return (
                <CircleMarker
                  key={idx}
                  center={[cluster.coordinates.lat, cluster.coordinates.lng]}
                  radius={radius}
                  fillColor="#ef4444"
                  color="#991b1b"
                  weight={2}
                  fillOpacity={opacity}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{cluster.city}</strong>
                      <br />
                      {cluster.country}
                      <br />
                      <span className="text-xs text-gray-600">
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
