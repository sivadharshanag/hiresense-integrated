// API Configuration and Service Layer
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Token management
const TOKEN_KEY = 'hiresense_token';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// API Response Types
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'recruiter' | 'applicant';
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

// API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: ApiResponse
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Base fetch wrapper with auth header
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.message || 'An error occurred',
      response.status,
      data
    );
  }

  return data;
}

// Auth API
export const authApi = {
  signup: async (
    fullName: string,
    email: string,
    password: string,
    role: 'recruiter' | 'applicant'
  ): Promise<ApiResponse<AuthResponse>> => {
    return apiFetch<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password, role }),
    });
  },

  signin: async (
    email: string,
    password: string
  ): Promise<ApiResponse<AuthResponse>> => {
    return apiFetch<AuthResponse>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getMe: async (): Promise<ApiResponse<{ user: AuthUser }>> => {
    return apiFetch<{ user: AuthUser }>('/api/auth/me', {
      method: 'GET',
    });
  },
};

// Jobs API
export const jobsApi = {
  getAll: async (params?: { status?: string; search?: string }): Promise<ApiResponse<any>> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    
    const query = queryParams.toString();
    return apiFetch<any>(`/api/jobs${query ? `?${query}` : ''}`);
  },

  getById: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/jobs/${id}`);
  },

  create: async (jobData: {
    title: string;
    description: string;
    department: string;
    location: string;
    employmentType: string;
    experienceLevel: string;
    salaryMin?: number;
    salaryMax?: number;
    requiredSkills: string[];
  }): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  },

  update: async (id: string, jobData: Partial<{
    title: string;
    description: string;
    department: string;
    location: string;
    employmentType: string;
    experienceLevel: string;
    salaryMin: number;
    salaryMax: number;
    requiredSkills: string[];
    status: string;
  }>): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(jobData),
    });
  },

  delete: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/jobs/${id}`, {
      method: 'DELETE',
    });
  },
};

// Applications API
export const applicationsApi = {
  getAll: async (): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/applications');
  },

  getMyApplications: async (): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/applications/my-applications');
  },

  getByJob: async (jobId: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/applications/job/${jobId}`);
  },

  getById: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/applications/${id}`);
  },

  apply: async (jobId: string, coverLetter?: string) => {
    return apiFetch('/api/applications', {
      method: 'POST',
      body: JSON.stringify({ jobId, coverLetter }),
    });
  },

  updateStatus: async (
    applicationId: string,
    status: string,
    note?: string
  ) => {
    return apiFetch(`/api/applications/${applicationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, note }),
    });
  },

  generateJustification: async (
    applicationId: string,
    action: 'select' | 'reject' | 'shortlist' | 'interview' | 'review'
  ): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/applications/${applicationId}/generate-justification`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  generateInterviewFocus: async (applicationId: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/applications/${applicationId}/generate-interview-focus`, {
      method: 'POST',
    });
  },

  generateSkillGapAnalysis: async (applicationId: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/applications/${applicationId}/generate-skill-gap-analysis`, {
      method: 'POST',
    });
  },

  // Get rejection feedback for applicant
  getRejectionFeedback: async (applicationId: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/applications/${applicationId}/rejection-feedback`);
  },

  bulkReject: async (jobId: string, confirmationText: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/applications/job/${jobId}/bulk-reject`, {
      method: 'POST',
      body: JSON.stringify({ confirmationText }),
    });
  },

  // Bulk shortlist specific applications
  bulkShortlist: async (jobId: string, applicationIds: string[]): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/applications/job/${jobId}/bulk-shortlist`, {
      method: 'POST',
      body: JSON.stringify({ applicationIds }),
    });
  },

  // Bulk reject specific applications
  bulkRejectSpecific: async (jobId: string, applicationIds: string[], rejectionReason?: string, sendFeedback?: boolean): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/applications/job/${jobId}/bulk-reject-specific`, {
      method: 'POST',
      body: JSON.stringify({ applicationIds, rejectionReason, sendFeedback }),
    });
  },

  // Get selected/hired candidates
  getSelectedCandidates: async (): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/applications/recruiter/selected-candidates');
  },

  // Generate rejection feedback
  generateRejectionFeedback: async (applicationId: string, rejectionReason: string, customReason?: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/applications/${applicationId}/generate-rejection-feedback`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason, customReason }),
    });
  },

  // Get rejection reasons
  getRejectionReasons: async (): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/applications/recruiter/rejection-reasons');
  },

  // Update status with rejection reason
  updateStatusWithFeedback: async (
    applicationId: string,
    status: string,
    options?: {
      note?: string;
      rejectionReason?: string;
      sendFeedback?: boolean;
    }
  ): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/applications/${applicationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, ...options }),
    });
  },
};

// Talent Pool API
export const talentPoolApi = {
  getAll: async (params?: { status?: string; tag?: string }): Promise<ApiResponse<any>> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.tag) queryParams.append('tag', params.tag);
    
    const query = queryParams.toString();
    return apiFetch<any>(`/api/talent-pool${query ? `?${query}` : ''}`);
  },

  updateStatus: async (id: string, status: string, notes?: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/talent-pool/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  remove: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/talent-pool/${id}`, {
      method: 'DELETE',
    });
  },

  applyToJob: async (entryId: string, jobId: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/talent-pool/${entryId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    });
  },

  refreshSuggestions: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/talent-pool/${id}/refresh-suggestions`, {
      method: 'POST',
    });
  },
};

// Recruiter Profile API
export const recruiterApi = {
  getProfile: async (): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/recruiter/profile');
  },

  updateProfile: async (profileData: {
    companyName?: string;
    department?: string;
    jobTitle?: string;
    companyDescription?: string;
    companyWebsite?: string;
    companyLocation?: string;
    companyEmail?: string;
    phone?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/recruiter/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  getDashboard: async (): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/recruiter/dashboard');
  },

  // 🔐 VERIFICATION ENDPOINTS
  sendVerification: async (): Promise<ApiResponse<{ message: string }>> => {
    return apiFetch<{ message: string }>('/api/recruiter/send-verification', {
      method: 'POST',
    });
  },

  verifyEmail: async (token: string): Promise<ApiResponse<{ message: string }>> => {
    return apiFetch<{ message: string }>(`/api/recruiter/verify/${token}`, {
      method: 'GET',
    });
  },
};

// Applicant Profile API
export const applicantApi = {
  getProfile: async (): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/applicant/profile');
  },

  updateProfile: async (profileData: {
    phone?: string;
    location?: string;
    bio?: string;
    yearsOfExperience?: number;
    skills?: string[];
    preferredRoles?: string[];
    experience?: Array<{
      company: string;
      title: string;
      startDate: string;
      endDate?: string;
      current: boolean;
      description?: string;
    }>;
    experienceText?: string;
    education?: Array<{
      institution: string;
      degree: string;
      field: string;
      graduationYear: number;
    }>;
    educationText?: string;
    githubUsername?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    resumeUrl?: string;
    resumeFileName?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/applicant/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  getDashboard: async (): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/applicant/dashboard');
  },

  parseResume: async (file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('resume', file);
    
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/applicant/parse-resume`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    const data: ApiResponse<any> = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || 'Failed to parse resume',
        response.status,
        data
      );
    }

    return data;
  },

  analyzeLeetCode: async (username: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/applicant/analyze-leetcode', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  uploadAvatar: async (file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/applicant/upload-avatar`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    const data: ApiResponse<any> = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || 'Failed to upload avatar',
        response.status,
        data
      );
    }

    return data;
  },
};

// AI Analysis API
export const aiApi = {
  analyzeGitHub: async (username: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/ai/github', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  },

  evaluateApplication: async (applicationId: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/ai/evaluate/${applicationId}`, {
      method: 'POST',
    });
  },

  evaluateJobApplications: async (jobId: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/ai/evaluate-job/${jobId}`, {
      method: 'POST',
    });
  },
};

// Interview API
export const interviewsApi = {
  getAvailability: async (date: string, duration: number = 60): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/interviews/availability?date=${date}&duration=${duration}`);
  },

  schedule: async (data: {
    applicationId: string;
    scheduledTime: string;
    duration?: number;
    meetingLink?: string;
    type?: string;
    notes?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/interviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getAll: async (params?: { status?: string; date?: string }): Promise<ApiResponse<any>> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.date) queryParams.append('date', params.date);
    
    const query = queryParams.toString();
    return apiFetch<any>(`/api/interviews${query ? `?${query}` : ''}`);
  },

  update: async (id: string, data: {
    scheduledTime?: string;
    duration?: number;
    meetingLink?: string;
    type?: string;
    status?: string;
    notes?: string;
  }): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/interviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  cancel: async (id: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/interviews/${id}`, {
      method: 'DELETE',
    });
  },

  // Drop-off detection endpoints
  getInterviewsAtRisk: async (): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/interviews/at-risk');
  },

  getDropOffAnalytics: async (): Promise<ApiResponse<any>> => {
    return apiFetch<any>('/api/interviews/analytics/dropoff');
  },

  sendReminder: async (interviewId: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/interviews/${interviewId}/reminder`, {
      method: 'POST',
    });
  },

  confirmAttendance: async (interviewId: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/interviews/${interviewId}/confirm`, {
      method: 'POST',
    });
  },

  getWithRisk: async (interviewId: string): Promise<ApiResponse<any>> => {
    return apiFetch<any>(`/api/interviews/${interviewId}/risk`);
  },
};

export default {
  auth: authApi,
  jobs: jobsApi,
  applications: applicationsApi,
  recruiter: recruiterApi,
  applicant: applicantApi,
  ai: aiApi,
  interviews: interviewsApi,
  talentPool: talentPoolApi,
};
