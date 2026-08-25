# 🎬 5-Minute Project Walkthrough — SmartShop Billing
**Candidate:** Vitesh (B.Tech CSE, Amity University)  
**Project:** SmartShop (Store & Pawn Management System with Android SMS Bridge)  
**Live URL:** https://billing-app-mocha-xi.vercel.app/  
**GitHub:** https://github.com/vitesh9876/billing-app  

---

## ⏱️ Video Sequence & Timeline at a Glance

| Time | Section | Screen to Show | What to Cover |
| :--- | :--- | :--- | :--- |
| **0:00 – 1:15** | **1. Live App & Dashboard Demo** | Browser: [`billing-app-mocha-xi.vercel.app`](https://billing-app-mocha-xi.vercel.app/) | Introduction, problem statement, live billing, loan entry, interest calculation & printable slips |
| **1:15 – 2:10** | **2. Flowcharts & Architecture** | VS Code: [`project_flowchart.md`](file:///c:/Users/Vitesh/Downloads/SmartShop/project_flowchart.md) | End-to-end data flow, dual WebSockets, zero-cost SMS bridge gateway architecture |
| **2:10 – 3:10** | **3. Frontend Code Walkthrough** | VS Code: [`page.tsx`](file:///c:/Users/Vitesh/Downloads/SmartShop/frontend/src/app/page.tsx) & [`Dashboard.tsx`](file:///c:/Users/Vitesh/Downloads/SmartShop/frontend/src/components/Dashboard.tsx) | Next.js App Router, dynamic client rendering, state management, versioned API calls & live WebSockets |
| **3:10 – 4:00** | **4. Backend & Database Code** | VS Code: [`main.py`](file:///c:/Users/Vitesh/Downloads/SmartShop/backend/app/main.py), [`repository.py`](file:///c:/Users/Vitesh/Downloads/SmartShop/backend/app/repository/repository.py), [`models.py`](file:///c:/Users/Vitesh/Downloads/SmartShop/backend/app/models/models.py) | FastAPI REST APIs, Repository Pattern, SQLAlchemy models, and transactional SMS queue lifecycle |
| **4:00 – 4:40** | **5. Android SMS Bridge Code** | VS Code: [`SmsBridgeManager.kt`](file:///c:/Users/Vitesh/Downloads/SmartShop/sms-bridge/app/src/main/java/com/example/smsbridge/SmsBridgeManager.kt) & [`SmsBridgeService.kt`](file:///c:/Users/Vitesh/Downloads/SmartShop/sms-bridge/app/src/main/java/com/example/smsbridge/SmsBridgeService.kt) | Kotlin Foreground Service, WebSocket keep-alive, `SmsManager` dispatch & delivery callbacks |
| **4:40 – 5:00** | **6. Git Commits & Closing** | Browser: [GitHub Commits](https://github.com/vitesh9876/billing-app/commits) + Camera | Meaningful Git commit milestones, code quality summary, and confident wrap-up |

---

# 🎙️ Second-by-Second Teleprompter Script

---

### 📍 [0:00 – 1:15] Step 1: Live App & Dashboard Demo (75 seconds)
**🖥️ Screen:** Browser showing live deployed app: [https://billing-app-mocha-xi.vercel.app/](https://billing-app-mocha-xi.vercel.app/)

**🎙️ Say:**
> "Hi everyone! My name is **Vitesh**, and I'm a final-year B.Tech Computer Science student at **Amity University**.
>
> Today, I'm presenting **SmartShop**, a full-stack store and pawn management system I built for real-world jewelry and retail loan businesses.
>
> The problem I wanted to solve was that billing, customer records, pawn loan interest tracking, and SMS communication were handled as disconnected manual processes, with existing cloud SMS APIs being very expensive.
>
> *(Scroll through the live dashboard metrics)*
> Here is the live production app on Vercel. You can see real-time revenue analytics, active loan counts, and transaction summaries.
>
> *(Click 'New Loan' or 'Billing')*
> Let's create a new loan entry: I can enter customer details like **Rajesh Kumar**, phone number, and pledged items like **'2x Gold Ring'** with an amount of ₹15,000 and a 1.5% monthly interest rate.
>
> *(Click Submit / Print)*
> The system instantly computes interest parameters, saves the transaction, and generates a printable pawn receipt. At the same time, an automated SMS job is queued."

---

### 📍 [1:15 – 2:10] Step 2: System Architecture & Flowchart (55 seconds)
**🖥️ Screen:** Switch to VS Code and open [`project_flowchart.md`](file:///c:/Users/Vitesh/Downloads/SmartShop/project_flowchart.md) (Scroll to Section 1 & Section 2)

**🎙️ Say:**
> "Now let's look at the system architecture and data flow in `project_flowchart.md`.
>
> The system has three main components:
> 1. **Next.js with TypeScript and Tailwind** on the frontend for high-speed UI interaction.
> 2. **FastAPI with Python and SQLAlchemy** on the backend for versioned REST APIs and WebSockets.
> 3. An **Android Kotlin SMS Bridge** running directly on an in-store smartphone.
>
> *(Highlight the flow lines)*
> When a sale or loan is recorded, the backend formats a localized Telugu message and enqueues it. Instead of paying for third-party SMS gateways, the backend pushes the task in real-time over a WebSocket connection to the Android phone.
>
> The Android phone dispatches the carrier SMS natively through its SIM card and returns live delivery callbacks back to the web dashboard."

---

### 📍 [2:10 – 3:10] Step 3: Frontend Code Walkthrough (60 seconds)
**🖥️ Screen:** Open:
1. [`frontend/src/app/page.tsx`](file:///c:/Users/Vitesh/Downloads/SmartShop/frontend/src/app/page.tsx)
2. [`frontend/src/components/Dashboard.tsx`](file:///c:/Users/Vitesh/Downloads/SmartShop/frontend/src/components/Dashboard.tsx)

**🎙️ Say:**
> "Let's dive into the code.
>
> In `page.tsx`, the entry point dynamically loads the `Dashboard` component on the client side because the dashboard manages rich interactive state.
>
> In `Dashboard.tsx`, we manage billing, loan calculation, customer directory, and live bridge monitoring.
>
> The frontend communicates with versioned backend endpoints like `/api/v1/customers` and `/api/v1/transactions`.
>
> *(Scroll to WebSocket handlers in Dashboard.tsx)*
> I also integrated a WebSocket client so updates pushed from the backend or SMS bridge immediately update the UI state without needing manual page refreshes.
>
> An important architectural decision here was treating the backend database as the single source of truth, while React handles UI presentation and local validation."

---

### 📍 [3:10 – 4:00] Step 4: Backend & Database Code Walkthrough (50 seconds)
**🖥️ Screen:** Open:
1. [`backend/app/main.py`](file:///c:/Users/Vitesh/Downloads/SmartShop/backend/app/main.py)
2. [`backend/app/repository/repository.py`](file:///c:/Users/Vitesh/Downloads/SmartShop/backend/app/repository/repository.py)
3. [`backend/app/models/models.py`](file:///c:/Users/Vitesh/Downloads/SmartShop/backend/app/models/models.py)

**🎙️ Say:**
> "Moving to the backend:
>
> In `main.py`, I used FastAPI with clean API versioning under `/api/v1`.
>
> I implemented an asynchronous background task that scans active loans daily. When a loan is 30 days or 7 days away from expiry, it generates automated warning reminders with deduplication checks.
>
> In `repository.py`, I followed the **Repository Pattern** to decouple database operations from route handlers, making the code testable and maintainable.
>
> In `models.py`, we have structured SQLAlchemy models for Customers, Transactions, and the SMS Queue. The SMS Queue implements explicit lifecycle states—`Pending`, `Queued`, `Sending`, `Sent`, and `Failed`—with automatic retry support."

---

### 📍 [4:00 – 4:40] Step 5: Android SMS Bridge Code Walkthrough (40 seconds)
**🖥️ Screen:** Open:
1. [`sms-bridge/.../SmsBridgeManager.kt`](file:///c:/Users/Vitesh/Downloads/SmartShop/sms-bridge/app/src/main/java/com/example/smsbridge/SmsBridgeManager.kt)
2. [`sms-bridge/.../SmsBridgeService.kt`](file:///c:/Users/Vitesh/Downloads/SmartShop/sms-bridge/app/src/main/java/com/example/smsbridge/SmsBridgeService.kt)

**🎙️ Say:**
> "Here is the native Android SMS Bridge:
>
> In `SmsBridgeService.kt`, I engineered the service as an **Android Foreground Service** with a persistent notification and a `BootReceiver`. This prevents Android's Doze mode and aggressive battery optimizations from killing the process.
>
> In `SmsBridgeManager.kt`, the phone maintains a persistent WebSocket connection. When an `sms_task` arrives, it calls Android's telephony `SmsManager.sendTextMessage` and sends immediate `sms_result` status updates back to the server."

---

### 📍 [4:40 – 5:00] Step 6: Git Commits & Closing (20 seconds)
**🖥️ Screen:** Open browser tab: [github.com/vitesh9876/billing-app/commits](https://github.com/vitesh9876/billing-app/commits) (and switch to webcam)

**🎙️ Say:**
> "Finally, looking at my GitHub history: I maintained atomic, milestone-based commits throughout development—from setting up the repository architecture to fine-tuning the SMS foreground service and interest math.
>
> In summary, SmartShop bridges modern web technologies with native mobile hardware to deliver a complete, cost-effective retail management solution.
>
> Thank you so much for your time and for reviewing my project!"

---

### 📋 Rapid Checklist Before Recording:
* [x] **Tab 1:** [https://billing-app-mocha-xi.vercel.app/](https://billing-app-mocha-xi.vercel.app/)
* [x] **Tab 2:** [https://github.com/vitesh9876/billing-app/commits](https://github.com/vitesh9876/billing-app/commits)
* [x] **VS Code Files Open in Order:**
  1. `project_flowchart.md`
  2. `frontend/src/app/page.tsx` & `Dashboard.tsx`
  3. `backend/app/main.py`, `repository.py`, `models.py`
  4. `SmsBridgeManager.kt` & `SmsBridgeService.kt`
* [x] **Loom Mode:** Screen + Webcam enabled.
