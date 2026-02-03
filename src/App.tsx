import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Auth Pages
import SignUp from "@/pages/auth/SignUp";
import SignIn from "@/pages/auth/SignIn";
import AuthCallback from "@/pages/auth/AuthCallback";
import VerifyEmail from "@/pages/auth/VerifyEmail";

// Applicant Pages
import ApplicantDashboard from "@/pages/applicant/ApplicantDashboard";
import ApplicantProfile from "@/pages/applicant/ApplicantProfile";
import JobListings from "@/pages/applicant/JobListings";
import MyApplications from "@/pages/applicant/MyApplications";
import YourApplications from "@/pages/applicant/YourApplications";
import VirtualInterview from "@/pages/applicant/VirtualInterview";

// Recruiter Pages
import RecruiterDashboard from "@/pages/recruiter/RecruiterDashboard";
import RecruiterProfile from "@/pages/recruiter/RecruiterProfile";
import JobManagement from "@/pages/recruiter/JobManagement";
import CandidateEvaluation from "@/pages/recruiter/CandidateEvaluation";
import JobApplications from "@/pages/recruiter/JobApplications";
import InterviewScheduling from "@/pages/recruiter/InterviewScheduling";
import CandidateComparison from "@/pages/recruiter/CandidateComparison";
import SelectedCandidates from "@/pages/recruiter/SelectedCandidates";
import TalentPool from "@/pages/recruiter/TalentPool";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/signup" replace />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/auth/signin" element={<SignIn />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />

            {/* Recruiter Routes */}
            <Route path="/recruiter" element={<ProtectedRoute allowedRole="recruiter"><DashboardLayout><RecruiterDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/recruiter/profile" element={<ProtectedRoute allowedRole="recruiter"><DashboardLayout><RecruiterProfile /></DashboardLayout></ProtectedRoute>} />
            <Route path="/recruiter/jobs" element={<ProtectedRoute allowedRole="recruiter"><DashboardLayout><JobManagement /></DashboardLayout></ProtectedRoute>} />
            <Route path="/recruiter/jobs/applications" element={<ProtectedRoute allowedRole="recruiter"><DashboardLayout><JobApplications /></DashboardLayout></ProtectedRoute>} />
            <Route path="/recruiter/candidates" element={<ProtectedRoute allowedRole="recruiter"><DashboardLayout><CandidateEvaluation /></DashboardLayout></ProtectedRoute>} />
            <Route path="/recruiter/interviews" element={<ProtectedRoute allowedRole="recruiter"><DashboardLayout><InterviewScheduling /></DashboardLayout></ProtectedRoute>} />
            <Route path="/recruiter/compare" element={<ProtectedRoute allowedRole="recruiter"><DashboardLayout><CandidateComparison /></DashboardLayout></ProtectedRoute>} />
            <Route path="/recruiter/selected" element={<ProtectedRoute allowedRole="recruiter"><DashboardLayout><SelectedCandidates /></DashboardLayout></ProtectedRoute>} />
            <Route path="/recruiter/talent-pool" element={<ProtectedRoute allowedRole="recruiter"><DashboardLayout><TalentPool /></DashboardLayout></ProtectedRoute>} />

            {/* Applicant Routes */}
            <Route path="/applicant" element={<ProtectedRoute allowedRole="applicant"><DashboardLayout><ApplicantDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/applicant/profile" element={<ProtectedRoute allowedRole="applicant"><DashboardLayout><ApplicantProfile /></DashboardLayout></ProtectedRoute>} />
            <Route path="/applicant/jobs" element={<ProtectedRoute allowedRole="applicant"><DashboardLayout><JobListings /></DashboardLayout></ProtectedRoute>} />
            <Route path="/applicant/jobs/:jobId" element={<ProtectedRoute allowedRole="applicant"><DashboardLayout><JobListings /></DashboardLayout></ProtectedRoute>} />
            <Route path="/applicant/my-applications" element={<ProtectedRoute allowedRole="applicant"><DashboardLayout><MyApplications /></DashboardLayout></ProtectedRoute>} />
            <Route path="/applicant/feedback" element={<ProtectedRoute allowedRole="applicant"><DashboardLayout><YourApplications /></DashboardLayout></ProtectedRoute>} />
            <Route path="/applicant/virtual-interview" element={<ProtectedRoute allowedRole="applicant"><DashboardLayout><VirtualInterview /></DashboardLayout></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
