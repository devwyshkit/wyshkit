This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Expected Console Errors

### Chrome Extension Errors
The following error is **expected and harmless**:
- `Unchecked runtime.lastError: The message port closed before a response was received`

This occurs when browser extensions (like ad blockers, password managers, etc.) try to communicate with the page but the message port closes. This is not a bug in our code and can be safely ignored.

### Accessibility Warnings
The following warning is **expected and harmless**:
- `Blocked aria-hidden on an element because its descendant retained focus.`

This is a known issue with drawer/modal libraries (vaul) when drawers open. The warning is harmless - drawers properly manage focus and accessibility. The main content gets `aria-hidden` when a drawer opens, which is correct behavior for accessibility.

### Development Mode Logging
In development mode, we log all errors (including non-critical ones) to help with debugging. These logs are filtered out in production.

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
