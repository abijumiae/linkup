import SettingsSection from "../../components/SettingsSection";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-violet-300/80">Settings</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Account and privacy controls</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Manage your profile, notifications, security, language preferences, and account safety from one dashboard.
          </p>
        </header>

        <div className="space-y-6">
          <SettingsSection title="Account settings" description="Update your email, membership, and login preferences.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
                <p className="text-sm font-semibold text-white">Email</p>
                <p className="mt-2 text-sm text-slate-400">sam@linkup.design</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
                <p className="text-sm font-semibold text-white">Member since</p>
                <p className="mt-2 text-sm text-slate-400">Jan 2025</p>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="Profile settings" description="Customize visible information and sharing preferences.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
                <p className="text-sm font-semibold text-white">Display name</p>
                <p className="mt-2 text-sm text-slate-400">Sam Wilder</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
                <p className="text-sm font-semibold text-white">Username</p>
                <p className="mt-2 text-sm text-slate-400">@sam.wilder</p>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="Privacy settings" description="Control who can interact with you and view your activity.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
                <p className="text-sm font-semibold text-white">Profile visibility</p>
                <p className="mt-2 text-sm text-slate-400">Public</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
                <p className="text-sm font-semibold text-white">Activity status</p>
                <p className="mt-2 text-sm text-slate-400">Visible to connections</p>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="Notification settings" description="Manage alerts across your feed, groups, and activity.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
                <p className="text-sm font-semibold text-white">Email notifications</p>
                <p className="mt-2 text-sm text-slate-400">Enabled</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
                <p className="text-sm font-semibold text-white">Push alerts</p>
                <p className="mt-2 text-sm text-slate-400">Off</p>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="Security settings" description="Update your password and protect account access.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
                <p className="text-sm font-semibold text-white">Two-factor auth</p>
                <p className="mt-2 text-sm text-slate-400">Enabled</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
                <p className="text-sm font-semibold text-white">Trusted devices</p>
                <p className="mt-2 text-sm text-slate-400">3 devices</p>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title="Language settings" description="Choose your app language and regional preferences.">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
              <p className="text-sm font-semibold text-white">Language</p>
              <p className="mt-2 text-sm text-slate-400">English (US)</p>
            </div>
          </SettingsSection>

          <SettingsSection title="Blocked users" description="Review and manage accounts you have blocked.">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
              <p className="text-sm font-semibold text-white">No blocked users</p>
              <p className="mt-2 text-sm text-slate-400">You’re all clear.</p>
            </div>
          </SettingsSection>

          <SettingsSection title="Delete account" description="Remove your account and all associated data.">
            <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="text-sm font-semibold text-rose-200">Delete your account</p>
              <p className="mt-2 text-sm text-rose-300">This action is permanent and cannot be undone.</p>
              <button className="mt-4 inline-flex rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-rose-400">
                Delete account
              </button>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
