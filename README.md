# FreelanceFlow

**FreelanceFlow** is a modern, premium project management platform built specifically for freelancers to track time, manage clients, handle projects/tasks, and automatically generate PDF invoices.

🌐 **Live Demo:** [https://freelance-flow-five.vercel.app](https://freelance-flow-five.vercel.app)

---

## ⚡ Tech Stack
- **Frontend Framework:** React + Vite
- **Styling:** Vanilla CSS & Tailwind CSS styling techniques (Glassmorphism, Neon Accents, Dark Theme)
- **Database & Auth:** Supabase (PostgreSQL + built-in Authentication)
- **Deployment:** Vercel (Frontend Hosting) + Supabase Cloud (Backend)

## ✨ Core Features
- **Client & CRM Management:** Track all active and past clients, including custom rates.
- **Project Board:** Track total active projects, budget, and scope.
- **Task Management:** View upcoming deadlines.
- **Time Tracking:** Real-time logging of Work-In-Progress (WIP).
- **Invoicing System:** Automatic subtotal/tax calculations, PDF invoice generation using `jspdf`.
- **Dashboard Analytics:** Comprehensive real-time analysis of ARR, MRR, and project distribution.
- **Role-Based Plans:** Simulates Free vs Prom/Premium tier capabilities.

---

## 🚀 Local Development

1. Clone the repository
2. Navigate to the frontend directory: `cd frontend`
3. Install dependencies: `npm install`
4. Create a `.env.local` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
5. Run the Supabase SQL initialization script in your Supabase SQL Editor to generate the schema (found in the repository logs).
6. Start the local server: `npm run dev`

---

*Designed and Developed dynamically using AI.*
