# DocuMind

**DocuMind** is an AI-powered document assistant that lets you upload, preview, and chat with your files.  
It supports **PDF, DOCX, EXCEL, PPT and images**, and provides contextual answers, summaries, and insights using **DeepSeek** and **Gemini** APIs.

🔗 **Live Demo:** [https://docu-mind-afsk.vercel.app](https://docu-mind-afsk.vercel.app)

---

## ✨ Features

### 🔒 **File Management**
- **Secure File Uploads** – Upload and store files securely with Supabase storage
- **Multiple File Format Support** – PDF, DOCX, Excel, PowerPoint, and images
- **File Preview Modal** – Preview PDFs and images directly in the browser
- **Multi-File Chat Sessions** – Upload and chat with multiple documents simultaneously
- **File Collections** – Organize your documents into collections for better management

### 🤖 **AI-Powered Conversations**
- **Advanced AI Chat** – Ask questions, request summaries, and extract insights from your documents
- **Multiple AI Models** – Powered by DeepSeek and Gemini APIs for optimal performance
- **Context-Aware Responses** – AI understands your document content and provides relevant answers
- **Smart Prompt Suggestions** – Get context-aware suggestions for queries
- **Conversation History** – All chat sessions are saved and accessible anytime

### 👤 **User Experience**
- **Comprehensive Settings Panel** – Manage profile, preferences, usage, privacy, and data
- **Custom Avatar Support** – Upload custom avatars or use auto-generated initials
- **Email Notifications** – Configurable email alerts for important updates
- **Daily Reminder System** – Optional reminders to use your daily prompts
- **Real-time Updates** – Live updates for chat sessions and messages

### 📊 **Usage & Analytics**
- **Subscription Tiers** – Free (10 prompts/day), Pro (25 prompts/day), Legend (50 prompts/day)
- **Usage Tracking** – Track daily and monthly prompt usage with detailed statistics
- **Usage Dashboard** – Visual representation of your activity and limits
- **Daily Reset System** – Prompt limits reset automatically each day

### 🛡️ **Privacy & Security**
- **OAuth Authentication** – Secure sign-in with Google
- **Data Encryption** – All documents encrypted in transit and at rest
- **Privacy Controls** – Full control over your data and privacy settings
- **Data Export** – Export all your data in structured JSON format
- **Account Management** – Complete account deletion with data cleanup

### 🔧 **Additional Features**
- **Responsive Design** – Works perfectly on desktop and mobile devices
- **Notification History** – Track all email notifications sent to you
- **Test Email System** – Verify your email settings with test notifications
- **Session Management** – Organize and manage multiple chat sessions
- **Sidebar Navigation** – Easy access to all conversations and files

---

## 🚀 Getting Started

Clone the repository and install dependencies:

```bash
git clone <repo-url>
cd documind
npm install
```

Set up your environment variables:

```bash
cp .env.example .env.local
```

Configure the following environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `DEEPSEEK_API_KEY` - Your DeepSeek API key
- `GOOGLE_GENERATIVE_AI_API_KEY` - Your Gemini API key
- Email service configuration (if using notifications)

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🏗️ Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **Authentication:** Supabase Auth with Google OAuth
- **AI APIs:** DeepSeek, Google Gemini
- **Email:** Custom email service integration
- **Deployment:** Vercel

---

## 📂 Project Structure

```
documind/
├── pages/
│   ├── api/           # API routes
│   ├── dashboard/     # Main dashboard
│   ├── settings/      # User settings
│   └── index.js       # Landing page
├── components/        # React components
├── utils/            # Utility functions
├── styles/           # CSS styles
└── public/           # Static assets
```

---

## 🔑 Key Components

- **ChatInterface** - Main chat component with AI integration
- **FileUpload** - Drag-and-drop file upload with preview
- **Settings** - Comprehensive user settings panel
- **Sidebar** - Navigation and session management
- **UsageTracker** - Daily and monthly usage monitoring

---

## 📖 Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Supabase Documentation](https://supabase.com/docs) - Learn about Supabase
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS framework
- [DeepSeek API](https://platform.deepseek.com/docs) - AI API documentation
- [Google AI](https://ai.google.dev/) - Gemini API documentation

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---