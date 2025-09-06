This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

# FileMentor

**FileMentor** is an AI-powered document assistant that helps users upload, preview, and chat with their files. It supports PDF, DOCX, and image formats, providing contextual answers and suggestions using DeepSeek and Gemini APIs.

---

## Features

- **Secure File Uploads:**  
  Upload documents and images securely using Supabase storage.

- **AI Chat About Documents:**  
  Ask questions, request summaries, and get insights about your uploaded files using DeepSeek AI.

- **File Preview Modal:**  
  Preview images and PDFs directly in the browser. For unsupported formats, download or open in a new tab.

- **Prompt Suggestions:**  
  Get smart suggestions for questions to ask about your files.

- **Daily Usage Limits:**  
  Each user has a daily prompt limit to manage API usage.

- **OAuth Authentication:**  
  Sign in with Google for secure access.

- **Usage Tracking:**  
  Track daily prompt usage and reset limits every day.

---

## Getting Started

First, run the development server:

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

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.

---

## Folder Structure

- `/pages` – Next.js pages and API routes
- `/components` – React UI components (ChatInterface, FileUpload, etc.)
- `/lib` – API clients and utility functions
- `/styles` – Global styles (ensure `global.css` includes Tailwind directives)

---

## Tech Stack

- **Next.js** – React framework
- **Tailwind CSS** – Utility-first styling
- **Supabase** – Storage and authentication
- **DeepSeek & Gemini** – AI chat APIs
- **Google OAuth** – User authentication

---

