# Project Documentation: Adaptive Learning Platform (SaaS Ready)

## 🌟 Overview
This platform is a high-performance, **Adaptive Learning System** designed to personalize mathematics and literacy education. Built with **Next.js 14**, it utilizes a proprietary "Adaptive Engine" that adjusts question difficulty based on student performance.

The system is split into two primary experiences:
1.  **Student Practice Portal**: A gamified, interactive environment for skill mastery.
2.  **Teacher Insights Dashboard**: A premium analytics suite for tracking growth and diagnosing misconceptions in real-time.

---

## 🏗️ Technical Architecture
-   **Frontend**: Next.js (App Router), React, CSS Modules (Vanilla CSS).
-   **Backend**: Next.js API Routes (Node.js).
-   **Database**: 
    -   **MongoDB**: Unified single source of truth for curriculum (Grades, Subjects, Questions), student performance events, and user authentication/organization management.
-   **Styling**: Premium "Glassmorphism" aesthetics with custom-tailored HSL color palettes.

---

## 🔄 Complete Project Flow

### 1. The Student Journey (Adaptive Practice)
1.  **Onboarding**: Student logs in via a custom MongoDB-backed Auth system (JWT/NextAuth).
2.  **Skill Selection**: Student chooses a `MicroSkill` (e.g., "Number Lines" or "Multi-digit Addition").
3.  **Session Initialization**:
    -   Frontend calls `/api/adaptive/session/start`.
    -   Backend checks if an active session exists; if not, it initializes a state (Tokens: 0, Stage: 1).
4.  **Fetch & Solve Cycle**:
    -   Backend selects a question based on current difficulty and mastery.
    -   **High-Fidelity Rendering**: The `QuestionRenderer` identifies the type (`fillInTheBlank`, `mcq`, `butterflyFraction`, etc.) and renders visual diagrams (SVGs/Images).
5.  **Submission**:
    -   Submit answer to `/api/adaptive/answer/submit`.
    -   **Engine Logic**: If correct, "Tokens" increase. Upon reaching a threshold (e.g., 5 tokens), the student graduates to the next "Stage" (Difficulty increase).
6.  **Persistence**: Every attempt is logged as an `AttemptEvent` in MongoDB.

### 2. The Teacher Journey (Analytics & Intervention)
1.  **Dashboard Access**: Teachers access the `/teacher/dashboard`.
2.  **KPI Pulse**: Dashboard summarizes `Total Questions Solved`, `Average Accuracy`, and `Mastery Trends`.
3.  **Student Drilldown**:
    -   Teachers can expand a student's row to see **AI Insights** (strengths/weaknesses).
    -   **Skill Breakdown**: Detailed view of every attempted microskill.
4.  **Misconception Analysis (The Carousel)**:
    -   The system identifies "Trouble Spots" (skills with recurring failures).
    -   **High-Fidelity Review**: Teachers see an **Error Carousel** showing the exact question diagram the student saw, what the student entered, and what the correct answer was.
    -   *Technical Detail*: Backend uses recursive SVG cleaning to ensure diagrams render perfectly in the teacher's view.

---

## 📊 Data Schema Highlights (MongoDB)

### **Curriculum Hierarchy**
-   `Grades` -> `Subjects` -> `Units` -> `MicroSkills` -> `Questions`.

### **Core Collections**
-   **`questions`**: Stores `parts` (serialized JSON of the question structure), `correct_answer_text`, and `adaptiveConfig`.
-   **`attempt_events`**: Immutable ledger of every student action.
    -   Fields: `student_id`, `question_id`, `micro_skill_id`, `is_correct`, `answer_payload`, `session_id`.
-   **`micro_skills`**: The unit of mastery. Stores metadata like `code` (e.g., "A.4") and `prompt`.

---

## 🚀 SaaS Readiness Checklist
The project is architected for SaaS expansion:
-   [x] **Multi-Tenant Scoping**: API routes support `student_id` filtering (Ready for `org_id`).
-   [x] **Component Reusability**: `QuestionParts` is decoupled for use in both Practice and Analytics.
-   [x] **Unified Database**: Standardized on MongoDB for all operations, simplifying the infrastructure.
-   [x] **Role-Based Routing**: Separate entry points for `/practice` and `/teacher`.

---

## 🛠️ Developer Guide: Adding a New Question Type
1.  **Define Type**: Add the type name to `src/components/practice/QuestionRenderer.js`.
2.  **Create Renderer**: Build a new component (e.g., `NewTypeRenderer.js`) in `src/components/practice/`.
3.  **Update Static View**: Add the visual-only case to `src/components/practice/QuestionParts.js` for Teacher Dashboard compatibility.
4.  **CSS**: Add scoped styles in a `.module.css` file matching the renderer.

---
**Standardized on: Antigravity AI Framework v2.0**
