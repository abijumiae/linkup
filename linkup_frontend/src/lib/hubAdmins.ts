import { apiRequest } from "./api";
import { getToken } from "./auth";

export type HubAdminUser = {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

export type HubAdminMember = {
  userId: string;
  role: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER";
  user: HubAdminUser;
};

export type HubAdminsList = {
  owner: HubAdminMember;
  admins: HubAdminMember[];
  moderators: HubAdminMember[];
};

function authHeaders(): HeadersInit {
  const token = getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  return { Authorization: `Bearer ${token}` };
}

export async function fetchHubAdmins(groupId: string): Promise<HubAdminsList> {
  return apiRequest<HubAdminsList>(`/groups/${groupId}/admins`, {
    headers: authHeaders(),
  });
}

export async function addHubAdmin(
  groupId: string,
  targetUserId: string,
  role: "ADMIN" | "MODERATOR",
): Promise<HubAdminMember> {
  return apiRequest<HubAdminMember>(`/groups/${groupId}/admins`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ targetUserId, role }),
  });
}

export async function removeHubAdmin(
  groupId: string,
  targetUserId: string,
): Promise<HubAdminMember> {
  return apiRequest<HubAdminMember>(
    `/groups/${groupId}/admins/${targetUserId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
}
