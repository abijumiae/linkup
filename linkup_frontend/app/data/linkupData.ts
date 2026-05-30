import { Bell, Compass, Home, Layers, MessageCircle, Sparkles, Users } from "lucide-react";

export const landingFeatures = [
  {
    title: "Connect everything",
    description: "A single workspace for communities, content, and conversations.",
  },
  {
    title: "Premium dark mode",
    description: "A polished, immersive interface crafted for every screen size.",
  },
  {
    title: "Fast growth engine",
    description: "Engage with stories, trending topics, and intelligent feeds.",
  },
];

export const landingMetrics = [
  { label: "Active creators", value: "120K+" },
  { label: "Weekly engagement", value: "+30%" },
  { label: "Premium themes", value: "15" },
];

export const homeSidebarLinks = [
  { label: "Home", href: "/home", icon: "home" },
  { label: "Explore", href: "/explore", icon: "explore" },
  { label: "Chats", href: "/messages", icon: "messages" },
  { label: "Groups", href: "/groups", icon: "groups" },
  { label: "Notifications", href: "/notifications", icon: "notifications" },
] as const;

export const homeStats = [
  { label: "Stories", value: "12 active" },
  { label: "Communities", value: "8 live" },
];

export const homeStories = [
  { name: "Ava Reyes", status: "Live now" },
  { name: "Mila Rossi", status: "New post" },
  { name: "Noah Carter", status: "Top story" },
  { name: "Leo James", status: "Recommends" },
  { name: "Riley Quinn", status: "Trending" },
];

export const homeFeedTabs = ["For You", "Following", "Global", "My Country", "Communities"];

export const homePosts = [
  {
    author: "Nova Carter",
    role: "Product Designer",
    time: "2h ago",
    content: "Launching a new LinkUp community space today. Dark mode, gradient cards, and stronger engagement—all in one place.",
    stats: { likes: 240, comments: 38, shares: 14, saves: 12 },
  },
  {
    author: "Kai Rivera",
    role: "Community Lead",
    time: "5h ago",
    content: "The latest update features stories, trending cards, and mobile navigation for rapid adoption.",
    stats: { likes: 180, comments: 24, shares: 16, saves: 9 },
  },
];

export const homeTrendingTopics = ["#LinkUpLaunch", "#PremiumUX", "#CommunityFirst", "#DarkMode", "#MobileReady"];
export const homeSuggestions = ["Nina Holmes", "Eli Reyes", "Rae Walker"]; 
export const homeOnlineFriends = ["Jules", "Tess", "Mia", "Omar"];

export const exploreTrendingTags = ["#LinkUpLaunch", "#CreatorEconomy", "#DesignSystem", "#DarkMode", "#CommunityGrowth"];
export const pulseTrendChips = [
  "Tech",
  "Business",
  "Design",
  "Learning",
  "Local Pulse",
  "Opportunities",
];
export const exploreCreators = ["Avery Lane", "Noah Green", "Harper Quinn", "Milo Chen"];
export const creatorSpotlight = [
  { name: "Avery Lane", focus: "Product & community building" },
  { name: "Noah Green", focus: "Design systems & creative work" },
  { name: "Harper Quinn", focus: "Startups & opportunities" },
  { name: "Milo Chen", focus: "Tech & learning momentum" },
];
export const exploreCommunities = ["Product Builders", "Design Leaders", "Launch Teams", "Growth Marketers"];
export const explorePopularPosts = [
  {
    title: "How to host a virtual launch party",
    subtitle: "Live video, guest highlights, and post recap tips.",
  },
  {
    title: "Designing premium social cards",
    subtitle: "Use gradients, spacing, and contrast for polished feeds.",
  },
];

export const marketplaceCategories = [
  "Electronics",
  "Fashion",
  "Jobs",
  "Services",
  "Events",
  "Local",
];
export const marketplaceListings = [
  {
    title: "Brand refresh package",
    price: "$2,400",
    location: "Remote",
    seller: "Luna Studio",
    category: "Design",
    description: "Modern branding suite with logo, socials, and launch assets for premium creators.",
    saved: true,
  },
  {
    title: "Growth strategy call",
    price: "$120/hr",
    location: "San Francisco, CA",
    seller: "Eli Robinson",
    category: "Marketing",
    description: "One-hour consulting to optimize audience growth, community loyalty, and launch campaigns.",
  },
  {
    title: "Landing page template",
    price: "$99",
    location: "Remote",
    seller: "Avery Works",
    category: "Development",
    description: "High-converting landing page built for premium membership and marketplace launches.",
  },
];

export const jobTypes = [
  "Remote",
  "Full-time",
  "Part-time",
  "Freelance",
  "Internship",
  "Projects",
  "Creator",
  "Local",
  "Hybrid",
  "On-site",
];
export const jobsList = [
  {
    title: "Senior Product Designer",
    company: "Nimbus Labs",
    salary: "$140k - $160k",
    location: "Remote",
    type: "Remote",
    description: "Lead the design of our creator platform with premium workflows and polished product launches.",
  },
  {
    title: "Community Operations Lead",
    company: "Pulse Networks",
    salary: "$110k",
    location: "New York, NY",
    type: "On-site",
    description: "Build engagement strategies for launch communities and curate creator programming.",
  },
  {
    title: "Growth Marketing Manager",
    company: "BrightHive",
    salary: "$130k",
    location: "Austin, TX",
    type: "Hybrid",
    description: "Drive acquisition and retention campaigns for premium SaaS and social products.",
  },
];

export const eventFilterOptions = [
  "Tech",
  "Creators",
  "Business",
  "Local",
  "Online",
];
export const eventsList = [
  {
    title: "LinkUp Launch Mixer",
    host: "LinkUp Team",
    datetime: "Thu, Jun 12 • 7:00 PM UTC",
    location: "Online",
    mode: "Online",
    description: "Celebrate the new marketplace and networking features with creators worldwide.",
  },
  {
    title: "Premium Community Workshop",
    host: "Mila Chen",
    datetime: "Mon, Jun 17 • 4:00 PM PT",
    location: "San Francisco, CA",
    mode: "Offline",
    description: "A hands-on session for community builders looking to launch premium groups.",
  },
  {
    title: "Creator Growth Summit",
    host: "Avery Lane",
    datetime: "Sat, Jun 22 • 10:00 AM ET",
    location: "New York, NY",
    mode: "Offline",
    description: "Meet top creators and learn launch strategies for high-converting campaigns.",
  },
];

export type NotificationRecord = {
  icon: "like" | "comment" | "follow" | "message" | "group" | "event";
  message: string;
  time: string;
  unread?: boolean;
};

export const notificationsList: NotificationRecord[] = [
  { icon: "like", message: "Luna liked your marketplace listing.", time: "2m ago", unread: true },
  { icon: "comment", message: "Avery commented on your event post.", time: "15m ago", unread: true },
  { icon: "follow", message: "Nina started following you.", time: "1h ago", unread: false },
  { icon: "message", message: "Milo sent you a new message.", time: "3h ago", unread: false },
  { icon: "group", message: "Your group received a new member request.", time: "5h ago", unread: true },
  { icon: "event", message: "Your event starts tomorrow at 7 PM.", time: "1d ago", unread: false },
];

export const profilePosts = [
  { title: "Design systems for cohesive communities", summary: "A premium card layout makes launches feel polished and modern." },
  { title: "How to grow engagement with events", summary: "Host live group discussions and themed community weeks." },
  { title: "Building the perfect creator bio", summary: "Share purpose, links, and social momentum in one place." },
];

export const groupsData = {
  myGroups: [
    { name: "Creator Collective", category: "Growth & Design", members: "5.2K", coverLabel: "My group", actionLabel: "Manage" },
    { name: "Launch Lab", category: "Product builders", members: "3.1K", coverLabel: "My group", actionLabel: "Manage" },
  ],
  suggestedGroups: [
    { name: "Dark Mode Club", category: "UI & UX", members: "1.4K", coverLabel: "Suggested", actionLabel: "Join" },
    { name: "Community Builders", category: "Network", members: "2.0K", coverLabel: "Suggested", actionLabel: "Join" },
  ],
  popularGroups: [
    { name: "Future Creators", category: "Innovation", members: "12K", coverLabel: "Popular", actionLabel: "Join" },
    { name: "Remote Founders", category: "Startup", members: "9.6K", coverLabel: "Popular", actionLabel: "Join" },
    { name: "Social Makers", category: "Content", members: "8.1K", coverLabel: "Popular", actionLabel: "Join" },
  ],
};

export const adminStats = [
  { label: "Total users", value: "24,800", detail: "+320 today" },
  { label: "New users today", value: "320", detail: "Organic growth" },
  { label: "Total posts", value: "86,200", detail: "Active feeds" },
  { label: "Reports pending", value: "18", detail: "Needs review" },
  { label: "Active groups", value: "1,240", detail: "Community spaces" },
  { label: "Marketplace listings", value: "2,180", detail: "Live offers" },
  { label: "Jobs posted", value: "540", detail: "Open roles" },
  { label: "Events created", value: "140", detail: "Upcoming sessions" },
];

export const adminReports = [
  ["User report", "@neal.reyes", "Spam content", "2h ago"],
  ["Event issue", "@mila", "Inappropriate description", "4h ago"],
  ["Marketplace review", "@nova", "False listing details", "6h ago"],
];

export const adminUsers = [
  ["Avery Lane", "Creator", "Verified", "Joined 1h ago"],
  ["Milo Chen", "Growth", "Pending", "Joined 2h ago"],
  ["Rae Walker", "Curator", "Verified", "Joined 5h ago"],
];
