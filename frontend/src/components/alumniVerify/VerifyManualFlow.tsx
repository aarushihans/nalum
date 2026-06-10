import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  getUserProfile,
  checkAlumniManual,
  confirmAlumniMatch,
} from "@/lib/api";
import VerifyManualForm from "./VerifyManualForm";
import SelectMatchModal from "./SelectMatchModal";
import axios from "axios";
import { userEvent } from "@testing-library/user-event";

interface Match {
  name: string;
  roll_no: string;
  batch: string;
  branch: string;
}

interface VerifyManualFlowProps {
  onClose?: () => void;
}

const VerifyManualFlow = ({ onClose }: VerifyManualFlowProps) => {
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    roll_no: "",
    batch: "",
    branch: "",
  });
  const [matches, setMatches] = useState<Match[]>([]);
  const { setAuth, accessToken, user } = useAuth();

  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getUserProfile();
        const profile = response.data.data;
        setProfileData({
          name: profile.name || "",
          roll_no: profile.roll_no || "",
          batch: profile.batch || "",
          branch: profile.branch || "",
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfile();
  }, []);

  const handleFormSubmit = async (formData: {
    name: string;
    roll_no?: string;
    batch: string;
    branch: string;
  }) => {
    setIsLoading(true);

    try {
      const response = await checkAlumniManual(formData);
      const matchesData = response.data.matches || [];

      if (matchesData.length === 0) {
        // No matches found - added to admin queue
        toast("No Matches Found", {
          description:
            "Your verification request has been sent to the admin for manual review. You will be notified once it's processed.",
        });
        if (onClose) onClose();
      } else if (matchesData.length === 1) {
        // Single match - auto-confirm
        await handleConfirmMatch(matchesData[0]);
      } else {
        // Multiple matches - show selection modal
        setMatches(matchesData);
        setIsSelectModalOpen(true);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error("Verification Failed", {
          description:
            error.response?.data?.message || "Failed to check verification details",
        });
      } else {
        toast.error("Error", { description: "An unexpected error occurred" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmMatch = async (match: Match) => {
    setIsLoading(true);

    try {
      await confirmAlumniMatch({ roll_no: match.roll_no });

      // Update auth context with verified status
      if (accessToken && user) {
        setAuth(accessToken, { ...user, verified_alumni: true });
      }

      toast.success("Verification Successful! 🎉", {
        description: "Your alumni status has been verified successfully.",
      });

      setIsSelectModalOpen(false);
      if (onClose) onClose();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error("Verification Failed", {
          description:
            error.response?.data?.message || "Failed to confirm verification",
        });
      } else {
        toast.error("Error", { description: "An unexpected error occurred" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <VerifyManualForm
        initialData={profileData}
        onSubmit={handleFormSubmit}
        isLoading={isLoading}
      />

      {/* Match Selection Modal */}
      <SelectMatchModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        matches={matches}
        onSelect={handleConfirmMatch}
      />
    </>
  );
};

export default VerifyManualFlow;
