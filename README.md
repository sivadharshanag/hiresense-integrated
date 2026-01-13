# HireSense AI

An AI-powered recruitment platform that streamlines hiring for recruiters and job searching for applicants.

## 🚀 Live Demo

- **Frontend**: https://hiresense-gcc.vercel.app
- **Backend API**: https://hire-sense-xi.vercel.app

## ✨ Features

### For Recruiters
- 📝 Post and manage job listings
- 🤖 AI-powered candidate screening
- 📊 Application tracking dashboard
- 📅 Interview scheduling
- 💼 Talent pool management

### For Applicants
- 🔍 Browse and search job listings
- 📄 One-click job applications
- 📈 Application status tracking
- 🎯 AI-powered job recommendations
- 👤 Profile management

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router

### Backend
- Node.js + Express
- MongoDB Atlas
- Google Gemini AI
- Passport.js (OAuth)

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- MongoDB Atlas account
- Google Cloud Console account (for OAuth)

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/ivipin7/HireSense.git
cd HireSense

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Add your VITE_API_URL

# Start development server
npm run dev
```

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file with required variables:
# - MONGODB_URI
# - JWT_SECRET
# - GEMINI_API_KEY
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET
# - FRONTEND_URL

# Start development server
npm run dev
```

## 🌐 Deployment

Both frontend and backend are deployed on Vercel.

## 📄 License

MIT License

## 👨‍💻 Author

**Vipin** - [GitHub](https://github.com/ivipin7)
