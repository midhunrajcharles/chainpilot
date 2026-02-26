# Milestone 1: Core Backend + Orchestrator + Admin Panel Framework

**Duration:** 7 Days  
**Goal:** Establish the Postgres-backed infrastructure, implement the logical "Orchestrator" flow, create skeletons for the 6 core engines, and set up the admin panel.

> [!IMPORTANT]
> **Architecture Update**: Switched from generic structure to **Postgres** and specific **6-Engine** architecture as per the Tech Spec.

---

## Day 1: Project Initialization & Postgres Setup

**Focus:** Environment, Git, and Database Foundation.

- [ ] **Git Setup**:
  - Checkout `feature/milestone-1`.
  - Update `.gitignore` for Node/Python and `.env`.
- [ ] **Backend Initialization**:
  - Initialize Node.js project (or Python per legacy choice, assuming Node based on `package.json` hints).
  - Install dependencies: `express`, `pg` (Postgres client), `sequelize` (or `typeorm`/`knex` for ORM), `dotenv`.
  - Install dev tools: `nodemon`, `eslint`.
- [ ] **Database Setup (Postgres)**:
  - Spin up local Postgres or Supabase/Neon instance.
  - Connect via `backend/utils/db.js`.
  - **Deliverable**: Successful console log "Connected to Postgres".

## Day 2: Data Modeling (The "Brain" State)

**Focus:** Implementing the detailed schema from Section 5 of Specs.

- [ ] **Schema Migration**:
  - Define Tables/Models:
    - `users` (Telegram ID, basic info).
    - `user_persona_state` (stage, intimacy, warmth, streaks).
    - `user_personality_axes` (secure/anxious, direct/indirect scores).
    - `user_quirks` (active quirk flags).
    - `messages` (history).
    - `memories` (long-term extracted facts).
- [ ] **Seeding**:
  - Create a seed script to initialize a test user with default "Stranger" state.

## Day 3: Telegram Bot & Basic Flow

**Focus:** Connectivity and Message Ingestion.

- [ ] **Bot Service**:
  - Implement `backend/services/telegramBot.js` (Webhooks preferred).
  - Handle `webhook` payload parsing.
- [ ] **Orchestrator Skeleton**:
  - Create `backend/services/orchestrator.js`.
  - **Flow**: Webhook -> Orchestrator -> (Placeholder Engines) -> Response.
- [ ] **Echo Test**:
  - Ensure the bot can receive a message, save it to `messages` table, and reply with a static text.

## Day 4: Engine Skeletons & Modular Hooks

**Focus:** Structuring the 6 Core Engines (Code Structure Only).

- [ ] **Engine Modules**:
  - Create directory `backend/engines/`.
  - Create class/module skeletons:
    - `PersonaEngine`
    - `RelationshipEngine` (with `MemoryWarmth` submodule)
    - `MoodEngine`
    - `UserPersonalityEngine`
    - `MicroQuirkEngine`
    - `SurpriseReinforcementEngine`
- [ ] **Orchestrator Integration**:
  - Update Orchestrator to call these engines in sequence (even if they just return default/null for now).
  - Example: `const mood = MoodEngine.getCurrentMood(state);`

## Day 5: Safety, Memory, & Prompt Engine Stubs

**Focus:** Supporting systems.

- [ ] **Safety & Moderation**:
  - Stub `backend/services/safety.js`.
- [ ] **Memory System**:
  - Implement basic save/retrieve in `backend/services/memory.js`.
- [ ] **Prompt Engine**:
  - Create `backend/engines/promptEngine.js`.
  - specific task: Construct a basic prompt string using the `Persona` config (hardcoded for now).

## Day 6: Admin Panel Backend API

**Focus:** Management endpoints.

- [ ] **Endpoints**:
  - `GET /api/admin/users`: View all users + current Stage/Intimacy.
  - `POST /api/admin/users/:id/reset`: Reset interaction state.
  - `GET /api/admin/logs`: View `analytics_events`.
- [ ] **Integration**:
  - Ensure these endpoints query the Postgres DB correctly.

## Day 7: Admin Frontend & Verification

**Focus:** UI and E2E Testing.

- [ ] **Frontend**:
  - Simple HTML/JS dashboard in `admin-panel/`.
  - Connect to API to show User Table (with columns for 'Stage', 'Intimacy').
- [ ] **Verification**:
  - **Test Run**:
        1. User chats -> Bot replies (stub).
        2. DB updates `messages` and `user_persona_state`.
        3. Admin Panel shows the new user and updated message count.
- [ ] **Pull Request**:
  - Prepare PR for `feature/milestone-1` merge.
