import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  Mail,
  UserCheck,
  CheckCircle,
  Loader2,
  Clock,
  XCircle,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { AxiosError } from "axios";
import { BRANCHES } from "@/constants/branches";
import BatchYearSelect from "@/components/BatchYearSelect";

interface VerificationStatus {
  verified_alumni: boolean;
  pending_verification: boolean;
  rejected_verification: boolean;
  rejection_reason: string | null;
}

interface ApiErrorResponse {
  message?: string;
}

const VerifyAlumni = () => {
  const { accessToken, refreshUser, user, isLoading: isAuthLoading, logout } = useAuth();
  const { profile } = useProfile();

  const [activeMethod, setActiveMethod] = useState<"code" | "manual" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | undefined>(undefined);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Code verification state
  const [verificationCode, setVerificationCode] = useState("");

  // Manual verification state
  const [manualName, setManualName] = useState("");
  const [manualRollNo, setManualRollNo] = useState("");
  const [manualBatch, setManualBatch] = useState("");
  const [manualBranch, setManualBranch] = useState("");

  // Contact info state
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactLinkedIn, setContactLinkedIn] = useState("");

  // Rejected state — user clicked "Submit New Request", show form again
  const [showFormAfterRejection, setShowFormAfterRejection] = useState(false);

  // Pre-fill form from profile once profile loads
  useEffect(() => {
    if (!profile) return;
    if (profile.user?.name) setManualName(profile.user.name);
    if (profile.batch) setManualBatch(profile.batch);
    if (profile.branch) setManualBranch(profile.branch);
    if (profile.social_media?.linkedin) setContactLinkedIn(profile.social_media.linkedin);
  }, [profile]);

  // Check verification status on mount and poll every 5 seconds
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await api.get("/alumni/status", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setVerificationStatus(response.data);

        if (response.data.verified_alumni && !verificationStatus?.verified_alumni) {
          toast.success("🎉 You have been verified as an alumni!");
          await refreshUser();
        }
      } catch (error) {
        console.error("Error checking verification status:", error);
        if (isCheckingStatus) {
          toast.error("Failed to check verification status");
        }
      } finally {
        setIsCheckingStatus(false);
      }
    };

    if (accessToken) {
      checkStatus();
      const pollInterval = setInterval(checkStatus, 5000);
      return () => clearInterval(pollInterval);
    }
  }, [accessToken, verificationStatus?.verified_alumni, isCheckingStatus, refreshUser]);

  // Method 1: Code Verification
  const handleCodeVerification = async () => {
    if (!verificationCode.trim()) {
      toast.error("Please enter a verification code");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post(
        "/alumni/verify-code",
        { code: verificationCode },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.data.success) {
        toast.success("🎉 Alumni status verified successfully!");
        setVerificationStatus({
          verified_alumni: true,
          pending_verification: false,
          rejected_verification: false,
          rejection_reason: null,
        });
        setVerificationCode("");
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Method 2: Manual Verification (Admin Review)
  const handleManualSubmit = async () => {
    if (!manualName.trim() || !manualBatch.trim() || !manualBranch) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      // Sync any changed values back to profile first
      const profileChanged =
        manualName !== profile?.user?.name ||
        manualBatch !== profile?.batch ||
        manualBranch !== profile?.branch ||
        contactLinkedIn !== profile?.social_media?.linkedin;

      if (profileChanged) {
        try {
          await api.put(
            "/profile/update",
            {
              name: manualName,
              batch: manualBatch,
              branch: manualBranch,
              campus: profile?.campus,
              social_media: { linkedin: contactLinkedIn },
            },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
        } catch {
          toast.error("Failed to save your changes, please try again");
          setIsLoading(false);
          return;
        }
      }

      // Submit to verification queue
      await api.post(
        "/alumni/check-manual",
        {
          name: manualName,
          roll_no: manualRollNo,
          batch: manualBatch,
          branch: manualBranch,
          contact_info: {
            phone: contactPhone,
            alternate_email: contactEmail,
            linkedin: contactLinkedIn,
          },
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      toast.success("Your verification request has been submitted to admins for review");
      setShowFormAfterRejection(false);
      setVerificationStatus((prev) =>
        prev
          ? { ...prev, pending_verification: true, rejected_verification: false, rejection_reason: null }
          : undefined
      );
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      toast.error(axiosError.response?.data?.message || "Submission failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) return null;
  if (user?.role !== 'alumni') return <Navigate to="/dashboard" replace />;

  let content: React.ReactNode;

  if (isCheckingStatus) {
    content = (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-nsut-maroon mx-auto mb-4" />
          <p className="text-gray-600">Checking verification status...</p>
        </div>
      </div>
    );
  } else if (verificationStatus?.verified_alumni) {
    content = (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Alumni Status Verified! 🎉
            </h2>
            <p className="text-gray-600 mb-6">
              Your alumni status has been successfully verified. You now have
              full access to all dashboard features.
            </p>
            <Button
              onClick={() => (window.location.href = "/dashboard")}
              className="bg-nsut-maroon hover:bg-nsut-maroon/90"
            >
              Go to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  } else if (verificationStatus?.pending_verification) {
    content = (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <Clock className="h-20 w-20 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verification Request Pending
            </h2>
            <p className="text-gray-600 mb-2">
              Your request has been submitted and is under admin review.
            </p>
            <p className="text-sm text-gray-500">
              This usually takes 2–3 business days. This page will update automatically once a decision is made.
            </p>
          </Card>
        </div>
      </div>
    );
  } else if (verificationStatus?.rejected_verification && !showFormAfterRejection) {
    content = (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <XCircle className="h-20 w-20 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verification Request Rejected
            </h2>
            <p className="text-gray-600 mb-4">
              Your request was not approved.
            </p>
            {verificationStatus.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-semibold text-red-800 mb-1">Reason:</p>
                <p className="text-sm text-red-700">{verificationStatus.rejection_reason}</p>
              </div>
            )}
            <Button
              onClick={() => setShowFormAfterRejection(true)}
              className="bg-nsut-maroon hover:bg-nsut-maroon/90"
            >
              Submit New Request
            </Button>
          </Card>
        </div>
      </div>
    );
  } else {
    content = (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <ShieldCheck className="h-16 w-16 text-nsut-maroon mx-auto mb-4" />
            <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">
              Verify Your Alumni Status
            </h1>
            <p className="text-lg text-gray-600">
              Complete verification to unlock all dashboard features
            </p>
          </div>

          {/* Verification Methods */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-3xl mx-auto">
            <Card
              className={`p-6 cursor-pointer transition-all border-2 ${
                activeMethod === "code"
                  ? "border-nsut-maroon bg-nsut-maroon/5"
                  : "border-gray-200 hover:border-nsut-maroon/50"
              }`}
              onClick={() => setActiveMethod("code")}
            >
              <Mail className="h-10 w-10 text-nsut-maroon mb-3" />
              <h3 className="font-bold text-gray-900 mb-2">Verification Code</h3>
              <p className="text-sm text-gray-600">
                Use the 10-digit code sent to your alumni email
              </p>
            </Card>

            <Card
              className={`p-6 cursor-pointer transition-all border-2 ${
                activeMethod === "manual"
                  ? "border-nsut-maroon bg-nsut-maroon/5"
                  : "border-gray-200 hover:border-nsut-maroon/50"
              }`}
              onClick={() => setActiveMethod("manual")}
            >
              <UserCheck className="h-10 w-10 text-nsut-maroon mb-3" />
              <h3 className="font-bold text-gray-900 mb-2">Manual Review</h3>
              <p className="text-sm text-gray-600">
                Submit details for admin verification
              </p>
            </Card>
          </div>

          {/* Verification Forms */}
          {activeMethod && (
            <Card className="p-8">
              {/* Code Verification Form */}
              {activeMethod === "code" && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Enter Verification Code
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Enter the 10-digit verification code that was sent to your
                    registered alumni email address.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="code">Verification Code</Label>
                      <Input
                        id="code"
                        placeholder="Enter 10-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        maxLength={10}
                        className="font-mono tracking-wider"
                      />
                    </div>

                    <Button
                      onClick={handleCodeVerification}
                      disabled={isLoading || verificationCode.length !== 10}
                      className="w-full bg-nsut-maroon hover:bg-nsut-maroon/90"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify Code"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Manual Verification Form */}
              {activeMethod === "manual" && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Manual Verification Request
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Submit your details for manual verification by the admin
                    team. This process may take 2–3 business days.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="manual-name">Full Name *</Label>
                      <Input
                        id="manual-name"
                        placeholder="Enter your full name"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="manual-roll">Roll Number (Optional)</Label>
                      <Input
                        id="manual-roll"
                        placeholder="Enter your roll number"
                        value={manualRollNo}
                        onChange={(e) => setManualRollNo(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="manual-batch">Batch (Passing Year) *</Label>
                        <BatchYearSelect
                          id="manual-batch"
                          value={manualBatch}
                          onValueChange={setManualBatch}
                          mode="alumni"
                        />
                      </div>

                      <div>
                        <Label htmlFor="manual-branch">Branch *</Label>
                        <Select value={manualBranch} onValueChange={setManualBranch}>
                          <SelectTrigger id="manual-branch">
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {BRANCHES.map((branch) => (
                              <SelectItem key={branch} value={branch}>
                                {branch}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Contact Information Section */}
                    <div className="border-t border-gray-200 pt-6 mt-6">
                      <h4 className="font-semibold text-gray-900 mb-3">
                        Contact Information
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Provide contact details so admins can reach you if needed
                      </p>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="contact-phone">Phone Number</Label>
                          <Input
                            id="contact-phone"
                            type="tel"
                            placeholder="e.g., +91 9876543210"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label htmlFor="contact-email">Alternate Email</Label>
                          <Input
                            id="contact-email"
                            type="email"
                            placeholder="e.g., personal@gmail.com"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label htmlFor="contact-linkedin">LinkedIn Profile</Label>
                          <Input
                            id="contact-linkedin"
                            type="url"
                            placeholder="e.g., https://linkedin.com/in/yourprofile"
                            value={contactLinkedIn}
                            onChange={(e) => setContactLinkedIn(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Please ensure all information is
                        accurate. The admin team will verify your details against
                        college records.
                      </p>
                    </div>

                    <Button
                      onClick={handleManualSubmit}
                      disabled={isLoading}
                      className="w-full bg-nsut-maroon hover:bg-nsut-maroon/90"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit for Review"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Help Section */}
          <Card className="mt-8 p-6 bg-gray-50">
            <h4 className="font-semibold text-gray-900 mb-3">Need Help?</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                • <strong>Verification Code:</strong> Check your alumni email
                for the 10-digit code
              </p>
              <p>
                • <strong>Manual Review:</strong> Submit your details and
                contact information for admin verification
              </p>
              <p>
                • <strong>Need Help?</strong> Contact admin@nsut.ac.in if you
                face issues
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="flex justify-end px-6 pt-4">
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-nsut-maroon transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
      {content}
    </div>
  );
};

export default VerifyAlumni;
