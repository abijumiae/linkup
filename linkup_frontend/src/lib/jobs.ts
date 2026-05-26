import { apiRequest, ApiError } from "./api";
import { clearAuth, getToken } from "./auth";

export interface JobPoster {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  jobType: string | null;
  salary: string | null;
  requirements: string | null;
  contactEmail: string | null;
  posterId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  poster: JobPoster;
  isOwner: boolean;
  hasApplied: boolean;
  applicationsCount: number;
}

export interface JobApplicant {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  email: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  applicantId: string;
  coverLetter: string | null;
  resumeUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  applicant: JobApplicant;
}

export interface MyJobApplication {
  id: string;
  jobId: string;
  applicantId: string;
  coverLetter: string | null;
  resumeUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  job: Job & { poster: JobPoster };
}

export interface CreateJobPayload {
  title: string;
  company: string;
  description: string;
  location: string;
  jobType?: string;
  salary?: string;
  requirements?: string;
  contactEmail?: string;
}

export interface UpdateJobPayload {
  title?: string;
  company?: string;
  description?: string;
  location?: string;
  jobType?: string;
  salary?: string;
  requirements?: string;
  contactEmail?: string;
}

export interface ApplyJobPayload {
  coverLetter?: string;
  resumeUrl?: string;
}

export interface JobsFilters {
  q?: string;
  location?: string;
  jobType?: string;
}

function authHeaders(): HeadersInit {
  const token = getToken();

  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function withAuth<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuth();
    }
    throw error;
  }
}

export async function fetchJobs(filters: JobsFilters = {}): Promise<Job[]> {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.location?.trim()) params.set("location", filters.location.trim());
  if (filters.jobType?.trim()) params.set("jobType", filters.jobType.trim());

  const query = params.toString();
  const path = query ? `/jobs?${query}` : "/jobs";

  return withAuth(() =>
    apiRequest<Job[]>(path, {
      headers: authHeaders(),
    }),
  );
}

export async function fetchJob(id: string): Promise<Job> {
  return withAuth(() =>
    apiRequest<Job>(`/jobs/${id}`, {
      headers: authHeaders(),
    }),
  );
}

export async function fetchMyJobPosts(): Promise<Job[]> {
  return withAuth(() =>
    apiRequest<Job[]>("/jobs/my/posts", {
      headers: authHeaders(),
    }),
  );
}

export async function fetchMyApplications(): Promise<MyJobApplication[]> {
  return withAuth(() =>
    apiRequest<MyJobApplication[]>("/jobs/my/applications", {
      headers: authHeaders(),
    }),
  );
}

export async function fetchJobApplications(
  jobId: string,
): Promise<JobApplication[]> {
  return withAuth(() =>
    apiRequest<JobApplication[]>(`/jobs/${jobId}/applications`, {
      headers: authHeaders(),
    }),
  );
}

export async function createJob(payload: CreateJobPayload): Promise<Job> {
  return withAuth(() =>
    apiRequest<Job>("/jobs", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateJob(
  id: string,
  payload: UpdateJobPayload,
): Promise<Job> {
  return withAuth(() =>
    apiRequest<Job>(`/jobs/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function deleteJob(id: string): Promise<{ message: string }> {
  return withAuth(() =>
    apiRequest<{ message: string }>(`/jobs/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }),
  );
}

export async function applyToJob(
  jobId: string,
  payload: ApplyJobPayload,
): Promise<JobApplication> {
  return withAuth(() =>
    apiRequest<JobApplication>(`/jobs/${jobId}/apply`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}
