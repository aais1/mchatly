# mchatly

This is a [Next.js](https://nextjs.org) MVP for a **chatbot creation + embed + chat history** platform.

## Getting Started

### 1) Configure environment

Create a `.env` file (see `.env.example`):

- `MONGODB_URI` (required)
- `ABLY_API_KEY` (required for live chat websockets)
- `NEXT_PUBLIC_APP_URL` (optional)

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

## MVP flow

1. Go to `/`.
2. Create a chatbot name/description.
3. Copy the generated token + embed code.
4. Visit `/history?token=...` to see conversation logs.

## API endpoints

- `POST /api/create-chatbot`

  - Body: `{ name: string, description?: string }`
  - Returns: `{ chatbot: { id, name, description, token, createdAt } }`

- `POST /api/log-chat`

  - Body: `{ token: string, userMessage: string, botResponse: string }`
  - Returns: `{ logged: true, id, timestamp }`

- `GET /api/get-chat-history?token=...&limit=50`
  - Returns: `{ token, items: [{ id, userMessage, botResponse, timestamp }] }`

## Widget

The embed code loads:

- `/widget.js?token=...`

The widget supports real-time admin chat using Ably websockets and logs messages via `POST /api/log-chat`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
