export const PLATFORMS = ["Instagram", "Facebook", "LinkedIn", "YouTube", "TikTok"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const ROLES = [
  "Designer",
  "Video Editor",
  "Content Writer",
  "Account Manager",
  "Social Media Manager",
] as const;

export const PROJECT_STATUS = [
  "Planning",
  "Designing",
  "Editing",
  "Review",
  "Published",
  "Completed",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUS)[number];

export interface Employee {
  id: string;
  name: string;
  role: (typeof ROLES)[number];
  department: string;
  email: string;
  status: "Active" | "Away" | "Offline";
  clients: number;
  tasks: number;
  initials: string;
  color: string;
}

export const EMPLOYEES: Employee[] = [
  { id: "e1", name: "Ishanshu", role: "Account Manager", department: "Client Services", email: "ishanshu@socialnxt.in", status: "Active", clients: 6, tasks: 12, initials: "I", color: "#2563EB" },
  { id: "e2", name: "Priya Sharma", role: "Designer", department: "Creative", email: "priya@socialnxt.in", status: "Active", clients: 4, tasks: 9, initials: "PS", color: "#10B981" },
  { id: "e3", name: "Rohan Kapoor", role: "Video Editor", department: "Creative", email: "rohan@socialnxt.in", status: "Away", clients: 3, tasks: 7, initials: "RK", color: "#F59E0B" },
  { id: "e4", name: "Neha Verma", role: "Content Writer", department: "Content", email: "neha@socialnxt.in", status: "Active", clients: 5, tasks: 11, initials: "NV", color: "#EC4899" },
  { id: "e5", name: "Vikram Singh", role: "Social Media Manager", department: "Strategy", email: "vikram@socialnxt.in", status: "Active", clients: 7, tasks: 14, initials: "VS", color: "#8B5CF6" },
  { id: "e6", name: "Ishita Roy", role: "Designer", department: "Creative", email: "ishita@socialnxt.in", status: "Offline", clients: 2, tasks: 5, initials: "IR", color: "#06B6D4" },
  { id: "e7", name: "Karan Patel", role: "Account Manager", department: "Client Services", email: "karan@socialnxt.in", status: "Active", clients: 5, tasks: 10, initials: "KP", color: "#EF4444" },
];

export interface Client {
  id: string;
  name: string;
  industry: string;
  accountManager: string;
  designer: string;
  videoEditor: string;
  platforms: Platform[];
  status: ProjectStatus;
  initials: string;
  color: string;
}

export const CLIENTS: Client[] = [
  { id: "c1", name: "Sukriti Sampada", industry: "Education", accountManager: "Ishanshu", designer: "Priya Sharma", videoEditor: "Rohan Kapoor", platforms: ["Instagram", "Facebook", "YouTube"], status: "Designing", initials: "SS", color: "#2563EB" },
  { id: "c2", name: "AAS NGO", industry: "Non-Profit", accountManager: "Karan Patel", designer: "Ishita Roy", videoEditor: "Rohan Kapoor", platforms: ["Facebook", "Instagram", "LinkedIn"], status: "Review", initials: "AN", color: "#10B981" },
  { id: "c3", name: "Golden Brix", industry: "Construction", accountManager: "Ishanshu", designer: "Priya Sharma", videoEditor: "Rohan Kapoor", platforms: ["Instagram", "LinkedIn"], status: "Planning", initials: "GB", color: "#F59E0B" },
  { id: "c4", name: "Sav Zaman Boxing", industry: "Sports & Fitness", accountManager: "Karan Patel", designer: "Ishita Roy", videoEditor: "Rohan Kapoor", platforms: ["Instagram", "YouTube"], status: "Published", initials: "SZ", color: "#EF4444" },
  { id: "c5", name: "WebNxt", industry: "Technology", accountManager: "Ishanshu", designer: "Priya Sharma", videoEditor: "Rohan Kapoor", platforms: ["LinkedIn", "Instagram", "YouTube"], status: "Editing", initials: "WN", color: "#8B5CF6" },
  { id: "c6", name: "Sunita Real Estate", industry: "Real Estate", accountManager: "Karan Patel", designer: "Ishita Roy", videoEditor: "Rohan Kapoor", platforms: ["Instagram", "Facebook"], status: "Designing", initials: "SR", color: "#06B6D4" },
  { id: "c7", name: "Royal Properties", industry: "Real Estate", accountManager: "Ishanshu", designer: "Priya Sharma", videoEditor: "Rohan Kapoor", platforms: ["Instagram", "Facebook", "YouTube"], status: "Completed", initials: "RP", color: "#EC4899" },
  { id: "c8", name: "Monga Properties", industry: "Real Estate", accountManager: "Karan Patel", designer: "Ishita Roy", videoEditor: "Rohan Kapoor", platforms: ["Facebook", "LinkedIn"], status: "Planning", initials: "MP", color: "#0EA5E9" },
];

export interface Task {
  id: string;
  title: string;
  client: string;
  assignee: string;
  priority: "Low" | "Medium" | "High";
  status: "Pending" | "In Progress" | "Completed";
  due: string;
}

export const TASKS: Task[] = [
  { id: "t1", title: "Design Instagram reel cover", client: "Sukriti Sampada", assignee: "Priya Sharma", priority: "High", status: "In Progress", due: "Jul 02" },
  { id: "t2", title: "Edit donor testimonial video", client: "AAS NGO", assignee: "Rohan Kapoor", priority: "Medium", status: "Pending", due: "Jul 03" },
  { id: "t3", title: "Write monthly content plan", client: "Golden Brix", assignee: "Neha Verma", priority: "High", status: "In Progress", due: "Jul 04" },
  { id: "t4", title: "Schedule July posts", client: "WebNxt", assignee: "Vikram Singh", priority: "Medium", status: "Pending", due: "Jul 05" },
  { id: "t5", title: "Approve property carousel", client: "Royal Properties", assignee: "Ishanshu", priority: "Low", status: "Completed", due: "Jun 28" },
  { id: "t6", title: "Shoot brand reel", client: "Sav Zaman Boxing", assignee: "Rohan Kapoor", priority: "High", status: "In Progress", due: "Jul 06" },
  { id: "t7", title: "LinkedIn carousel design", client: "Monga Properties", assignee: "Ishita Roy", priority: "Medium", status: "Pending", due: "Jul 07" },
  { id: "t8", title: "Caption writing batch", client: "Sunita Real Estate", assignee: "Neha Verma", priority: "Low", status: "In Progress", due: "Jul 08" },
];

export interface Meeting {
  id: string;
  title: string;
  client: string;
  date: string;
  time: string;
  attendees: string[];
  status: "Upcoming" | "Completed";
}

export const MEETINGS: Meeting[] = [
  { id: "m1", title: "July content review", client: "Sukriti Sampada", date: "Jul 02, 2026", time: "11:00 AM", attendees: ["Ishanshu", "Priya Sharma"], status: "Upcoming" },
  { id: "m2", title: "Quarterly strategy", client: "AAS NGO", date: "Jul 03, 2026", time: "03:30 PM", attendees: ["Karan Patel", "Vikram Singh"], status: "Upcoming" },
  { id: "m3", title: "Brand kickoff", client: "Golden Brix", date: "Jul 04, 2026", time: "10:00 AM", attendees: ["Ishanshu", "Neha Verma"], status: "Upcoming" },
  { id: "m4", title: "Reel review", client: "Sav Zaman Boxing", date: "Jun 26, 2026", time: "12:00 PM", attendees: ["Rohan Kapoor"], status: "Completed" },
  { id: "m5", title: "Campaign wrap", client: "Royal Properties", date: "Jun 24, 2026", time: "04:00 PM", attendees: ["Ishanshu"], status: "Completed" },
];

export interface Deal {
  id: string;
  client: string;
  project: string;
  amount: number;
  owner: string;
  due: string;
  stage: "New" | "Planning" | "Design" | "Editing" | "Review" | "Completed";
}

export const DEALS: Deal[] = [
  { id: "d1", client: "Sukriti Sampada", project: "July Reels Pack", amount: 45000, owner: "Ishanshu", due: "Jul 10", stage: "Design" },
  { id: "d2", client: "AAS NGO", project: "Annual Report Video", amount: 80000, owner: "Karan Patel", due: "Jul 18", stage: "Editing" },
  { id: "d3", client: "Golden Brix", project: "Brand Launch Campaign", amount: 120000, owner: "Ishanshu", due: "Jul 22", stage: "Planning" },
  { id: "d4", client: "Sav Zaman Boxing", project: "Fight Promo Series", amount: 60000, owner: "Karan Patel", due: "Jul 12", stage: "Review" },
  { id: "d5", client: "WebNxt", project: "LinkedIn Thought Leadership", amount: 35000, owner: "Ishanshu", due: "Jul 09", stage: "New" },
  { id: "d6", client: "Royal Properties", project: "Property Walkthroughs", amount: 95000, owner: "Karan Patel", due: "Jun 30", stage: "Completed" },
  { id: "d7", client: "Sunita Real Estate", project: "Festive Carousel", amount: 28000, owner: "Ishanshu", due: "Jul 15", stage: "Design" },
  { id: "d8", client: "Monga Properties", project: "Listing Reels", amount: 42000, owner: "Karan Patel", due: "Jul 20", stage: "Planning" },
];

export interface Proposal {
  id: string;
  name: string;
  client: string;
  amount: number;
  status: "Draft" | "Sent" | "Approved" | "Rejected";
  created: string;
}

export const PROPOSALS: Proposal[] = [
  { id: "p1", name: "Q3 Social Retainer", client: "Sukriti Sampada", amount: 135000, status: "Sent", created: "Jun 20, 2026" },
  { id: "p2", name: "NGO Awareness Campaign", client: "AAS NGO", amount: 240000, status: "Approved", created: "Jun 15, 2026" },
  { id: "p3", name: "Brand Identity + Launch", client: "Golden Brix", amount: 180000, status: "Draft", created: "Jun 22, 2026" },
  { id: "p4", name: "YouTube Series", client: "Sav Zaman Boxing", amount: 95000, status: "Sent", created: "Jun 18, 2026" },
  { id: "p5", name: "LinkedIn Growth Pack", client: "WebNxt", amount: 65000, status: "Approved", created: "Jun 10, 2026" },
  { id: "p6", name: "Festive Property Reels", client: "Royal Properties", amount: 110000, status: "Rejected", created: "Jun 08, 2026" },
];

export interface Issue {
  id: string;
  title: string;
  client: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  assignee: string;
  status: "Open" | "In Progress" | "Resolved";
}

export const ISSUES: Issue[] = [
  { id: "i1", title: "Logo misaligned in reel", client: "Sukriti Sampada", priority: "Medium", assignee: "Priya Sharma", status: "In Progress" },
  { id: "i2", title: "Captions need revision", client: "AAS NGO", priority: "Low", assignee: "Neha Verma", status: "Open" },
  { id: "i3", title: "Audio sync issue on reel", client: "Sav Zaman Boxing", priority: "High", assignee: "Rohan Kapoor", status: "Open" },
  { id: "i4", title: "Wrong brand color used", client: "Golden Brix", priority: "Critical", assignee: "Priya Sharma", status: "In Progress" },
  { id: "i5", title: "Posting schedule conflict", client: "WebNxt", priority: "Medium", assignee: "Vikram Singh", status: "Resolved" },
  { id: "i6", title: "Property photos low-res", client: "Royal Properties", priority: "High", assignee: "Ishita Roy", status: "Open" },
];

export interface ScheduledContent {
  id: string;
  day: number; // day of current month
  title: string;
  client: string;
  platform: Platform;
}

export const SCHEDULED: ScheduledContent[] = [
  { id: "s1", day: 2, title: "Welcome reel", client: "Sukriti Sampada", platform: "Instagram" },
  { id: "s2", day: 3, title: "Donor story", client: "AAS NGO", platform: "Facebook" },
  { id: "s3", day: 5, title: "Project teaser", client: "Golden Brix", platform: "LinkedIn" },
  { id: "s4", day: 7, title: "Fight night promo", client: "Sav Zaman Boxing", platform: "YouTube" },
  { id: "s5", day: 9, title: "Founder note", client: "WebNxt", platform: "LinkedIn" },
  { id: "s6", day: 11, title: "New listing", client: "Sunita Real Estate", platform: "Instagram" },
  { id: "s7", day: 12, title: "Walkthrough", client: "Royal Properties", platform: "YouTube" },
  { id: "s8", day: 14, title: "Carousel", client: "Monga Properties", platform: "Facebook" },
  { id: "s9", day: 15, title: "Reel batch", client: "Sukriti Sampada", platform: "Instagram" },
  { id: "s10", day: 17, title: "Awareness post", client: "AAS NGO", platform: "Instagram" },
  { id: "s11", day: 19, title: "Site update", client: "Golden Brix", platform: "Instagram" },
  { id: "s12", day: 20, title: "Behind the scenes", client: "Sav Zaman Boxing", platform: "Instagram" },
  { id: "s13", day: 22, title: "Tech blog snippet", client: "WebNxt", platform: "LinkedIn" },
  { id: "s14", day: 24, title: "Open house", client: "Royal Properties", platform: "Facebook" },
  { id: "s15", day: 26, title: "Festive teaser", client: "Sunita Real Estate", platform: "Instagram" },
  { id: "s16", day: 28, title: "Listings recap", client: "Monga Properties", platform: "LinkedIn" },
];

export const PLATFORM_COLOR: Record<Platform, string> = {
  Instagram: "#EC4899",
  Facebook: "#2563EB",
  LinkedIn: "#0A66C2",
  YouTube: "#EF4444",
  TikTok: "#000000",
};

export const REVENUE_BY_MONTH = [
  { month: "Jan", revenue: 320 },
  { month: "Feb", revenue: 380 },
  { month: "Mar", revenue: 420 },
  { month: "Apr", revenue: 510 },
  { month: "May", revenue: 560 },
  { month: "Jun", revenue: 640 },
];

export const PLATFORM_DISTRIBUTION = [
  { name: "Instagram", value: 42 },
  { name: "Facebook", value: 22 },
  { name: "LinkedIn", value: 18 },
  { name: "YouTube", value: 18 },
];

export const DEMO_ACCOUNTS = [
  { email: "admin@socialnxt.in", password: "demo123", role: "Admin" },
  { email: "ishanshu@socialnxt.in", password: "demo123", role: "Account Manager" },
  { email: "priya@socialnxt.in", password: "demo123", role: "Designer" },
];
