import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, AlertCircle } from "lucide-react";
import { COUNTRIES } from "@/constants/countries";
import { toast } from "sonner";
import api from "@/lib/api";

interface LocationSelectorProps {
  city: string;
  country: string;
  onLocationChange: (
    city: string,
    country: string,
    coordinates?: { lat: number; lng: number },
  ) => void;
  variant?: "light" | "dark";
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  city,
  country,
  onLocationChange,
  variant = "dark",
}) => {
  const [cityInput, setCityInput] = useState(city || "");
  const [countryInput, setCountryInput] = useState(country || "");
  const [isLoading, setIsLoading] = useState(false);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleUseMyLocation = async () => {
    setIsLoading(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser", {
        duration: 4000,
        action: {
          label: "Type Manually",
          onClick: () => setUseManualEntry(true),
        },
      });
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "User-Agent": "NSUT-Alumni-Network/1.0" } },
          );
          const data = await response.json();
          const detectedCity =
            data.address.city ||
            data.address.town ||
            data.address.village ||
            "";
          const detectedCountry = data.address.country || "";
          setCityInput(detectedCity.toLowerCase());
          setCountryInput(detectedCountry.toLowerCase());
          onLocationChange(
            detectedCity.toLowerCase(),
            detectedCountry.toLowerCase(),
            { lat: latitude, lng: longitude },
          );
        } catch (error) {
          console.error("Error fetching location:", error);
          toast.error("Failed to detect location", {
            duration: 4000,
            action: {
              label: "Type Manually",
              onClick: () => setUseManualEntry(true),
            },
          });
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Location permission denied", {
          duration: 5000,
          action: {
            label: "Allow Again",
            onClick: () => handleUseMyLocation(),
          },
          description: "or type manually below",
        });
        setUseManualEntry(true);
        setIsLoading(false);
      },
    );
  };

  const handleManualUpdate = async () => {
    if (cityInput && countryInput) {
      // Try to geocode the manually entered location
      try {
        const query = `${cityInput}, ${countryInput}`;
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
          { headers: { "User-Agent": "NSUT-Alumni-Network/1.0" } },
        );
        const data = await response.json();
        if (data && data.length > 0) {
          const coordinates = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          };
          onLocationChange(
            cityInput.toLowerCase(),
            countryInput.toLowerCase(),
            coordinates,
          );
        } else {
          // No coordinates found, save without them
          onLocationChange(cityInput.toLowerCase(), countryInput.toLowerCase());
        }
      } catch (error) {
        console.error("Failed to geocode:", error);
        // Save without coordinates if geocoding fails
        onLocationChange(cityInput.toLowerCase(), countryInput.toLowerCase());
      }
    }
  };

  const filteredCountries = COUNTRIES.filter((c) =>
    c.includes(searchQuery.toLowerCase()),
  );
  const sortedCountries = searchQuery
    ? filteredCountries
    : ["india", ...COUNTRIES.filter((c) => c !== "india")];

  return (
    <div className="space-y-4">
      <div>
        <Label
          htmlFor="city"
          className={variant === "light" ? "text-gray-700" : "text-gray-300"}
        >
          City
        </Label>
        <Input
          id="city"
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          onBlur={handleManualUpdate}
          placeholder="Enter your city"
          className={
            variant === "light"
              ? "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
              : "bg-black/20 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:ring-blue-500/20"
          }
        />
      </div>

      <div>
        <Label
          htmlFor="country"
          className={variant === "light" ? "text-gray-700" : "text-gray-300"}
        >
          Country
        </Label>
        <Select
          value={countryInput}
          onValueChange={(val) => {
            setCountryInput(val);
            handleManualUpdate();
          }}
        >
          <SelectTrigger
            className={
              variant === "light"
                ? "bg-white border-gray-300 text-gray-900"
                : "bg-black/20 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:ring-blue-500/20"
            }
          >
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {sortedCountries.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleUseMyLocation}
        disabled={isLoading}
        className={
          variant === "light"
            ? "w-full bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
            : "w-full bg-black/20 border-white/10 text-white hover:bg-black/30 hover:text-white"
        }
      >
        <MapPin className="h-4 w-4 mr-2" />
        {isLoading ? "Detecting..." : "Use My Location"}
      </Button>
    </div>
  );
};

export default LocationSelector;
