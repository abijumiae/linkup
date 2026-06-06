"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Shield, UserMinus, UserPlus } from "lucide-react";
import { ApiError } from "@/src/lib/api";
import { hubAdminWarningFromError } from "@/src/lib/apiWarnings";
import {
  addHubAdmin,
  fetchHubAdmins,
  HubAdminMember,
  HubAdminsList,
  removeHubAdmin,
} from "@/src/lib/hubAdmins";
import { useSocket } from "@/src/components/SocketProvider";
import { getCurrentUser } from "@/src/lib/auth";

type GroupHubAdminsSectionProps = {
  groupId: string;
  isOwner: boolean;
  hubRole: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER" | null;
  onHubRoleChange?: (role: GroupHubAdminsSectionProps["hubRole"]) => void;
};

function canManageHubAdmins(isOwner: boolean, hubRole: string | null) {
  return isOwner || hubRole === "OWNER" || hubRole === "ADMIN";
}

function canAssignHubAdmin(isOwner: boolean, hubRole: string | null) {
  return isOwner || hubRole === "OWNER";
}

function memberLabel(role: HubAdminMember["role"]) {
  if (role === "OWNER") {
    return "Owner";
  }
  if (role === "ADMIN") {
    return "Hub Admin";
  }
  if (role === "MODERATOR") {
    return "Moderator";
  }
  return "Member";
}

function AdminRow({
  member,
  canRemove,
  onRemove,
  removing,
}: {
  member: HubAdminMember;
  canRemove: boolean;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-brand-dark/60">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary text-xs font-bold text-white">
        {member.user.name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
          {member.user.name}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          @{member.user.username}
        </p>
      </div>
      <span className="shrink-0 rounded bg-brand-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary dark:text-brand-secondary">
        {memberLabel(member.role)}
      </span>
      {canRemove ? (
        <button
          type="button"
          disabled={removing}
          onClick={onRemove}
          className="flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
          aria-label={`Remove ${member.user.name}`}
        >
          <UserMinus className="h-5 w-5" />
        </button>
      ) : null}
    </li>
  );
}

export default function GroupHubAdminsSection({
  groupId,
  isOwner,
  hubRole,
  onHubRoleChange,
}: GroupHubAdminsSectionProps) {
  const { socket } = useSocket();
  const [list, setList] = useState<HubAdminsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [addRole, setAddRole] = useState<"ADMIN" | "MODERATOR">("MODERATOR");
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const canManage = canManageHubAdmins(isOwner, hubRole);
  const canAddAdmin = canAssignHubAdmin(isOwner, hubRole);
  const canAddModerator = canManage;

  const load = useCallback(async () => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchHubAdmins(groupId);
      setList(data);
      setError(null);
    } catch (err) {
      setError(hubAdminWarningFromError(err));
    } finally {
      setLoading(false);
    }
  }, [canManage, groupId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!socket || !canManage) {
      return;
    }
    const onHubRoleEvent = (payload: {
      groupId: string;
      targetUserId: string;
      role?: string;
    }) => {
      if (payload.groupId !== groupId) {
        return;
      }
      const me = getCurrentUser()?.id;
      if (me && payload.targetUserId === me && onHubRoleChange) {
        if (payload.role) {
          onHubRoleChange(
            payload.role as GroupHubAdminsSectionProps["hubRole"],
          );
        }
      }
      void load();
    };
    const onHubRoleRemoved = (payload: {
      groupId: string;
      targetUserId: string;
    }) => {
      if (payload.groupId !== groupId) {
        return;
      }
      const me = getCurrentUser()?.id;
      if (me && payload.targetUserId === me && onHubRoleChange) {
        onHubRoleChange("MEMBER");
      }
      void load();
    };
    socket.on("hub_admin_added", onHubRoleEvent);
    socket.on("hub_moderator_added", onHubRoleEvent);
    socket.on("hub_admin_removed", onHubRoleRemoved);
    socket.on("hub_moderator_removed", onHubRoleRemoved);
    return () => {
      socket.off("hub_admin_added", onHubRoleEvent);
      socket.off("hub_moderator_added", onHubRoleEvent);
      socket.off("hub_admin_removed", onHubRoleRemoved);
      socket.off("hub_moderator_removed", onHubRoleRemoved);
    };
  }, [socket, canManage, groupId, load]);

  if (!canManage) {
    return null;
  }

  const handleAdd = async () => {
    const id = targetUserId.trim();
    if (!id) {
      return;
    }
    if (addRole === "ADMIN" && !canAddAdmin) {
      setError("Only the hub owner can add hub admins.");
      return;
    }
    if (addRole === "MODERATOR" && !canAddModerator) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addHubAdmin(groupId, id, addRole);
      setTargetUserId("");
      await load();
    } catch (err) {
      setError(hubAdminWarningFromError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (member: HubAdminMember) => {
    if (member.role === "OWNER") {
      return;
    }
    const onlyAdmin =
      member.role === "ADMIN" &&
      (list?.admins.length ?? 0) <= 1 &&
      !isOwner;
    if (onlyAdmin) {
      setError("Cannot remove the only hub admin.");
      return;
    }
    setRemovingId(member.userId);
    setError(null);
    try {
      const updated = await removeHubAdmin(groupId, member.userId);
      await load();
      if (updated.userId && onHubRoleChange) {
        onHubRoleChange(updated.role === "MEMBER" ? "MEMBER" : updated.role);
      }
    } catch (err) {
      setError(hubAdminWarningFromError(err));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg dark:border-white/10 dark:bg-brand-dark/80">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-brand-primary dark:text-brand-secondary" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Hub Admins
        </h2>
      </div>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Permanent hub admins and moderators can help manage Live Talk and the
        hub. Room admins are temporary and only last for one Live Talk session.
      </p>

      {error ? (
        <div
          className="linkup-alert-error linkup-alert-enter mb-3 flex flex-wrap items-center justify-between gap-2"
          role="alert"
        >
          <p className="text-sm">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/10 dark:text-rose-200"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Retry
          </button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : list ? (
        <ul className="space-y-2">
          <AdminRow
            member={list.owner}
            canRemove={false}
            onRemove={() => undefined}
            removing={false}
          />
          {list.admins.map((m) => (
            <AdminRow
              key={m.userId}
              member={m}
              canRemove={canAddAdmin}
              onRemove={() => void handleRemove(m)}
              removing={removingId === m.userId}
            />
          ))}
          {list.moderators.map((m) => (
            <AdminRow
              key={m.userId}
              member={m}
              canRemove={canManage}
              onRemove={() => void handleRemove(m)}
              removing={removingId === m.userId}
            />
          ))}
        </ul>
      ) : null}

      <div className="mt-5 space-y-3 border-t border-slate-200/80 pt-4 dark:border-white/10">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Add by user ID
        </label>
        <input
          type="text"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          placeholder="Member user ID"
          className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-primary/60 dark:border-white/10 dark:bg-brand-dark dark:text-white"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={addRole}
            onChange={(e) =>
              setAddRole(e.target.value as "ADMIN" | "MODERATOR")
            }
            className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-brand-dark dark:text-white"
          >
            {canAddAdmin ? <option value="ADMIN">Make Hub Admin</option> : null}
            <option value="MODERATOR">Make Moderator</option>
          </select>
          <button
            type="button"
            disabled={busy || !targetUserId.trim()}
            onClick={() => void handleAdd()}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            Add
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The member must already have joined this hub. Copy their user ID from
          their profile.
        </p>
      </div>
    </section>
  );
}
