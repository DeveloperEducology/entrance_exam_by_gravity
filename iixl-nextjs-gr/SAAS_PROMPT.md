# AI Developer Prompt: Build the "Adaptive Learning SaaS"

**Task Goal:** Build a premium, multi-tenant Adaptive Learning Platform (SaaS) that personalizes student education and provides deep pedagogical insights to teachers.

---

## 🏗️ 1. Technical Stack
- **Framework:** Next.js 14+ (App Router, Server Actions).
- **Authentication:** Custom Auth with JWT or NextAuth.js (MongoDB Adapter). 
- **Database:** MongoDB (Unified store for Users, Organizations, Curriculum, and high-volume Student Attempt events).
- **Styling:** Premium Vanilla CSS Modules. **Aesthetics:** Glassmorphism, HSL color tokens, dark mode support, fluid micro-animations.

---

## 🗺️ 2. Core Architecture (Multi-Tenancy)
Implement a "Silo" data model:
- **Organizations (Tenants):** Schools, Districts, or Coaching Centers (Stored in `organizations` collection).
- **Users:** Store roles (`SUPER_ADMIN`, `ORG_ADMIN`, `TEACHER`, `STUDENT`) and `orgId` in a unified `users` collection.
- **Data Scoping:** Every document in MongoDB (`questions`, `attempts`, `sessions`) must include an `orgId`. All API routes must enforce `orgID` isolation via middleware/server-side checks.

---

## 🔄 3. Key Feature: The Adaptive Engine
Build a state-machine based engine for student practice:
- **Sessions:** Track progress in real-time without refreshing (tokens, current stage, difficulty).
- **Graduation Logic:** 
  - Correct Answer -> +1 Token. 
  - 5 Tokens -> Next Stage (Stage 1 -> 2 -> 3).
  - Incorrect Answer -> Pause progression, flag for review.
- **Question Logic:** Questions are JSON-driven "Parts" (Text, SVG, Image, MathLatex).
- **Renderers:** Build a modular `QuestionRenderer` that supports:
  - Fill-in-the-blank (with interactive math boxes).
  - Number Lines (dynamic SVGs).
  - Butterfly Fractions (canvas/SVG diagrams).
  - Long Multiplication (grid layouts).

---

## 📊 4. Key Feature: Teacher Dashboard (Premium Analytics)
Develop a "Command Center" for educators:
- **Global KPIs:** Monthly Active Students, Mastery Growth %, Accuracy distribution.
- **Interactive Student Rows:** Expandable rows leading to:
  - **AI Insights:** "John struggles with carrying digits but excels at mental math."
  - **Skill Performance:** Radar charts of mastery across different topics.
- **The "Error Review" Carousel:** 
  - Detect "Trouble Spots" (3+ recent errors in a skill).
  - Display a horizontal carousel of specific student mistakes.
  - **Visual Fidelity:** Use the same `QuestionRenderer` in a "Static/Read-only" mode so teachers see the exact diagram the student saw.

---

## 🎨 5. UI Architecture & Page Specifications
Define a high-fidelity experience for each user persona:

### A. The Landing Page (Conversion First)
- **Top Fold:** Hero section with a "Glass" effect, animated "Adaptive Engine" illustration, and a primary CTA: "Start Your School's Free Trial."
- **Social Proof:** Logos of onboarded schools/districts.
- **Value Props:** Three-column layout for: 
  - 🧠 *Neural Adaptation* (How the AI works).
  - 📊 *Intervention-Ready Insights* (For Teachers).
  - 🎮 *Gamified Mastery* (For Students).
- **Pricing:** Three-tier card system (Starter, Growth, District).

### B. Student Dashboard (Personalized Mastery)
- **Status HUD:** Horizontal bar at the top showing Grade, Total Tokens, and Day Streak.
- **"Jump Back In" Card:** Large, high-priority button linking to the last attempted microskill.
- **Skill Tree / Map:** Visual grid of skills (Wait-listed skills are greyed out; Mastered skills show a golden badge).

### C. Student Practice Portal (Focus Mode)
- **Minimalist Workspace:** White/Very-Light-Grey background to maximize focus.
- **Progression Bar:** Smoothly animate as tokens are earned.
- **The "Playground":** Centered, high-contrast question area for SVGs and Math inputs.
- **Feedback HUD:** Instant correct/incorrect animations with "Lottie" or "Framer Motion" for a rewarding feel.

### D. Teacher Dashboard (The Command Center)
- **Metric Tiles:** Accuracy %, Avg. Tokens/Session, Active Students.
- **The "Intervention Carousel":** Prominent error review section for Trouble Spots.
- **Student Performance Table:** Sorted by "Critical Need" (students with failing accuracy at the top).
- **Drill-down Modals:** Slide-in from right for individual student skill-by-skill reports.

### E. Org Admin Dashboard (Management)
- **Member Directory:** List of teachers and their class assignments.
- **Billing Portal:** Integrated Stripe/Razorpay management.
- **White-Labeling:** Upload logo and primary brand color pickers.

---

## 🎨 6. Design System & Aesthetics
- **Core Strategy:** Use a "Digital-Native" educational aesthetic.
- **Color Tokens (HSL):**
  - `Brand:` Primary (260, 80%, 60% - Soft Violet), Secondary (210, 80%, 60% - Trust Blue).
  - `State:` Success (142, 70%, 45%), Error (0, 84%, 60%), Warning (38, 92%, 50%).
  - `Neutral:` Slate/Zinc for layout (220, 15%, 15% - Dark; 0, 0%, 100% - Light).
- **Typography:** 
  - **Outfit:** Modern, geometric sans-serif for UI, buttons, and dashboards.
  - **Baloo 2:** Friendly, rounded font for question text and student feedback.
- **Effects:** Backdrop filters (Gaussian Blur 10px), subtle depth shadows, and border-glows on active elements.

---

## 🛠️ 6. Success Criteria
1. **Zero Data Leakage:** Teacher A from Org A cannot see Student B from Org B.
2. **High-Fidelity Rendering:** Complex SVGs (like number lines) must look perfect in both the mobile student view and the desktop teacher dashboard.
3. **Real-time Engine:** Student progress must persist in MongoDB after every click, allowing for "Stop and Resume" practice sessions.
