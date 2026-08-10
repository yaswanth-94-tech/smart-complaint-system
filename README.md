# Smart Complaint Management System (SCMS)

> **Hackathon Project | Problem Statement PS-06**  
> An AI-powered campus complaint routing, duplicate detection, image inspection, and recurring analytics platform for universities.

---

## 📌 Problem Statement (PS-06)

Students regularly face issues related to Wi-Fi, classrooms, laboratories, hostels, transportation, washrooms, electrical systems, plumbing, and other campus facilities. The Smart Complaint Management System automatically understands student complaints using Gemini AI, categorizes them, determines urgency, identifies the responsible department, detects similar/duplicate complaints, tracks progress, and provides insights into recurring campus problems.

---

## 🌟 Key Features

### 1. Student Portal (`/student`, `/complaints`, `/complaints/new`)
- **Automated AI Categorization**: Real-time Gemini classification of category, priority, department, and summary.
- **Multimodal Image Inspection**: Inspects uploaded facility photos (broken fans, exposed wires, leaks, dirty washrooms) with safety recommendations.
- **Similar / Duplicate Detection**: Identifies matching active complaints to prevent duplicates and links issues together.
- **Progress Tracking & Timeline**: Step-by-step history logs (`SUBMITTED` ➔ `ACKNOWLEDGED` ➔ `IN_PROGRESS` ➔ `RESOLVED`).
- **In-App Notifications**: Real-time bell notifications (`🔔`) when complaint status changes.

### 2. Department Staff Portal (`/department`)
- **Scoped Department Queue**: Displays *only* complaints assigned to staff's department (e.g. `IT Department`, `Electrical Maintenance`).
- **Workflow Actions**: **Acknowledge**, **Start Work**, **Mark Resolved** (records resolution timestamp), or **Reject** with work notes.

### 3. Administrator Console (`/admin`, `/admin/complaints`, `/admin/analytics`)
- **System Analytics**: Real-time metrics computed from Firestore (Total complaints, volume this week/month, resolution rate %, average resolution time in hours, critical issues count).
- **Master Complaint List**: Search, multi-filter, sort, and override priority, status, and department.
- **Recurring Campus Issue Clustering**: Automatically detects repeated building problems (e.g., repeated Wi-Fi outages in CSE Block) displaying complaint counts and affected student metrics.

---

## 🏗️ Architecture & Technology Stack

```
[ React + Vite + TypeScript ] ──(HTTP/REST)──> [ Express + Node.js + TypeScript ]
            │                                                 │
            │ (Firebase Client SDK)                           │ (@google/genai SDK)
            ▼                                                 ▼
[ Firebase Auth & Cloud Firestore ]                [ Google Gemini API ]
```

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, React Router DOM v6
- **Backend**: Node.js, Express, TypeScript, `@google/genai`
- **Database & Auth**: Firebase Authentication, Cloud Firestore, Firebase Storage
- **AI Model**: Gemini 2.5 Flash / Gemini 3.6 Flash

---

## 📁 Repository Structure

```
smart-complaint-system/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment configuration
│   │   ├── controllers/     # Express route handlers
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Gemini AI integration service
│   │   └── index.ts         # Server entrypoint
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Navigation, ProtectedRoute
│   │   ├── context/         # AuthContext
│   │   ├── hooks/           # useAuth
│   │   ├── pages/           # Student, Department & Admin pages
│   │   ├── services/        # Firebase & API services
│   │   └── types/           # TypeScript data interfaces
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── firestore.rules          # Cloud Firestore Security Rules
├── storage.rules            # Firebase Storage Security Rules
├── README.md
└── package.json
```

---

## ⚙️ Local Setup Guide

### Prerequisites
- Node.js LTS v18+ or v20+
- npm v9+

### 1. Clone Repository & Install Dependencies

```bash
git clone https://github.com/your-username/smart-complaint-system.git
cd smart-complaint-system

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Variables Setup

#### Backend (`backend/.env`)
Create `backend/.env`:
```env
PORT=5000
GEMINI_API_KEY=your_google_gemini_api_key
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

#### Frontend (`frontend/.env`)
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Run Development Servers

#### Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

#### Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🌐 API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend health check |
| `POST` | `/api/complaints/analyze` | Analyzes text title/description with Gemini AI |
| `POST` | `/api/complaints/check-duplicates` | Detects similar active complaints |
| `POST` | `/api/complaints/analyze-image` | Multimodal Gemini Vision photo inspection |

---

## 🗄️ Firestore Collections Structure

1. **`users/{uid}`**: `{ uid, name, email, role: 'student' | 'department_staff' | 'admin', department, createdAt, updatedAt }`
2. **`complaints/{id}`**: `{ userId, title, description, category, priority, department, location, imageUrl, status, aiAnalysis, duplicateOf, duplicateGroupId, createdAt, updatedAt, resolvedAt }`
3. **`complaint_updates/{id}`**: `{ complaintId, status, message, updatedBy, updatedByRole, createdAt }`
4. **`notifications/{id}`**: `{ userId, title, message, type, complaintId, read, createdAt }`

---

## 🚀 Render Deployment Setup

### Backend Service (Web Service)
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node dist/index.js`
- **Environment Variables**:
  - `PORT`: `5000` (or assigned by Render)
  - `GEMINI_API_KEY`: `<Your Gemini Key>`
  - `FRONTEND_URL`: `<Render Frontend Static Site URL>`

### Frontend Service (Static Site)
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: `<Render Backend Web Service URL>/api`
  - `VITE_FIREBASE_API_KEY`: `<Firebase API Key>`
  - `VITE_FIREBASE_AUTH_DOMAIN`: `<Firebase Auth Domain>`
  - `VITE_FIREBASE_PROJECT_ID`: `<Firebase Project ID>`
  - `VITE_FIREBASE_STORAGE_BUCKET`: `<Firebase Storage Bucket>`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`: `<Messaging Sender ID>`
  - `VITE_FIREBASE_APP_ID`: `<Firebase App ID>`
