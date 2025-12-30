# Server Restart Instructions

## Quick Restart

If you're experiencing white screen issues, follow these steps to restart the server:

### 1. Stop the Current Server

Press `Ctrl+C` (or `Cmd+C` on Mac) in the terminal where the server is running.

### 2. Clear Next.js Cache

```bash
# Remove Next.js build cache
rm -rf .next

# Optional: Clear node_modules cache (if issues persist)
# rm -rf node_modules/.cache
```

### 3. Restart Development Server

```bash
npm run dev
```

Or if using bun:

```bash
bun run dev
```

## Troubleshooting Steps

### Check for Port Conflicts

If port 3000 is already in use:

```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process (replace PID with actual process ID)
kill -9 <PID>
```

Or use a different port:

```bash
PORT=3001 npm run dev
```

### Check Server Logs

Look for errors in the terminal output:
- Red error messages
- Stack traces
- Failed imports
- Missing environment variables

### Verify Environment Variables

Ensure `.env.local` file exists and contains required variables:

```bash
# Check if file exists
ls -la .env.local

# Verify Supabase configuration
cat .env.local | grep SUPABASE
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Clear All Caches (Nuclear Option)

If issues persist:

```bash
# Remove all caches
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

# Reinstall dependencies (if needed)
npm install
# or
bun install

# Restart server
npm run dev
```

### Check Browser Console

Open browser DevTools (F12) and check:
- Console tab for JavaScript errors
- Network tab for failed requests
- Application tab for storage issues

### Common Issues

1. **White Screen on Load**
   - Check browser console for errors
   - Verify Supabase connection
   - Check network tab for failed API calls

2. **Server Won't Start**
   - Check if port is available
   - Verify Node.js version (requires Node 18+)
   - Check for syntax errors in code

3. **Build Errors**
   - Run `npm run build` to see full error messages
   - Check TypeScript errors: `npm run lint`

## Health Check Endpoints

After restarting, verify server is working:

```bash
# Check server health
curl http://localhost:3000/api/health

# Check Supabase connection
curl http://localhost:3000/api/health/supabase
```

## Still Having Issues?

1. Check the error logs in terminal
2. Review browser console errors
3. Verify all environment variables are set
4. Ensure database is accessible
5. Check network connectivity




