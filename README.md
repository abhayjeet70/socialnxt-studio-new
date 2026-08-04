# SocialNxt Studio

SocialNxt Studio is an all-in-one CRM and Social Media Management platform designed for agencies, freelancers, and businesses to streamline their workflows, manage clients, and track performance.

Built with a modern tech stack featuring **React 19, TanStack Start (SSR/Routing), Tailwind CSS, Radix UI, and Supabase**.

## 🌟 Key Features

### 1. Client & Contact Management (`/clients`)
*   **Centralized Database:** Keep track of all client details, company information, and contact persons.
*   **Status Tracking:** Monitor client status (Active, Inactive, Lead).
*   **Closed/Archived Clients:** Segregate and manage inactive or churned clients effectively.

### 2. Deal Pipeline & CRM (`/deals`)
*   **Kanban/List Views:** Visualize your sales pipeline.
*   **Deal Tracking:** Track deal value, expected close dates, and current stage.
*   **Conversion:** Easily convert successful deals into active client projects.

### 3. Task & Project Management (`/tasks`)
*   **Task Assignment:** Assign tasks to specific team members or clients.
*   **Status & Priority:** Track tasks by status (To Do, In Progress, Review, Done) and priority.
*   **Deadlines:** Ensure timely delivery with due date tracking.

### 4. Content & Approvals Pipeline
*   **Platform Integration:** Plan content for multiple platforms (Instagram, LinkedIn, Twitter, etc.).
*   **Approval Workflows:** Streamline the review process between internal teams and clients.

### 5. Calendar & Scheduling (`/calendar`)
*   **Unified View:** Visualize tasks, meetings, and content schedules in a unified calendar interface.
*   **Event Management:** Quickly add and edit events on the fly.

### 6. Meetings & Communication (`/meetings`)
*   **Meeting Notes:** Schedule meetings and keep track of agenda items and minutes.
*   **Participant Tracking:** Log internal team members and client participants for each meeting.

### 7. Proposals & Invoicing (`/proposals`)
*   **Document Generation:** Create professional proposals directly within the platform.
*   **PDF Export:** Export proposals to PDF format for client sharing.

### 8. Issue Tracking (`/issues`)
*   **Support Tickets:** Log and resolve client issues or internal bugs.
*   **Resolution Tracking:** Assign issues and track time-to-resolution.

### 9. Team & Access Control (`/team`)
*   **Role-Based Access Control (RBAC):** Manage permissions for Admin, Manager, and Viewer roles.
*   **Workspace Invites:** Seamlessly invite new team members via email.

### 10. Reporting & Activity Logs (`/reports`, `/activity-logs`)
*   **Analytics Dashboard:** Visual charts and metrics (powered by Recharts) for team productivity and deal conversion.
*   **Audit Trail:** Comprehensive activity logs tracking 'who did what and when' for security and accountability.

---

## 🔄 Core Workflows

### 1. The Sales to Onboarding Workflow
1.  **Lead Capture:** A new prospect is added to **Deals**.
2.  **Pitch:** A customized **Proposal** is generated and sent.
3.  **Conversion:** Once the proposal is accepted, the deal is moved to "Closed Won".
4.  **Onboarding:** The lead is converted into a **Client**. Welcome emails and onboarding checklists are triggered.

### 2. The Content Creation Workflow
1.  **Ideation:** A new **Task** is created for a social media post.
2.  **Drafting:** The creator drafts the copy and attaches assets.
3.  **Internal Review:** Task status is moved to "In Review" for the manager to approve.
4.  **Client Approval:** (Optional) The content is shared with the client for final sign-off.
5.  **Scheduling:** The post is added to the **Calendar** for publishing.

### 3. The Issue Resolution Workflow
1.  **Reporting:** A client reports a problem, or an internal bug is found. An **Issue** is created.
2.  **Assignment:** The issue is assigned to a specific team member.
3.  **Tracking:** Updates are logged on the issue ticket.
4.  **Resolution:** The issue is marked as "Resolved," and the client is notified.

---

## 🛠 Tech Stack

*   **Framework:** [TanStack Start](https://tanstack.com/start) (React 19)
*   **Routing:** [TanStack Router](https://tanstack.com/router)
*   **State Management:** [TanStack Query](https://tanstack.com/query)
*   **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
*   **UI Components:** [Radix UI](https://www.radix-ui.com/) (shadcn/ui patterns)
*   **Backend & Auth:** [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security)
*   **Forms:** React Hook Form + Zod validation
*   **Charts:** Recharts

## 🚀 Getting Started

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Environment Variables:**
    Create a `.env` file based on `.env.example` and add your Supabase URL and Anon Key.
3.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:5173` (or your configured Vite port).
