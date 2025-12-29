# Supabase Setup Guide

## Overview

WyshKit uses Supabase for:
- **Realtime subscriptions**: Real-time order updates, notifications
- **Storage**: Logo, scripts, and other static assets
- **Optional Auth**: Can be used alongside Better Auth

## Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Project Settings > API

## Environment Variables

Add these to your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Setup

### Required Tables

Supabase Realtime requires the following tables to exist in your database:

#### Orders Table

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES users(id),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  status TEXT NOT NULL DEFAULT 'pending',
  sub_status TEXT,
  items JSONB NOT NULL,
  item_total DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) DEFAULT 5,
  cashback_used DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  delivery_type TEXT DEFAULT 'local',
  delivery_address JSONB NOT NULL,
  payment_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Notifications Table (Optional)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'general',
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Row Level Security (RLS) Policies

### Orders Table

Enable RLS and create policies:

```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Customers can view their own orders
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = customer_id);

-- Vendors can view their own orders
CREATE POLICY "Vendors can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = vendor_id);

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access"
  ON orders FOR ALL
  USING (auth.role() = 'service_role');
```

### Notifications Table

```sql
-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

## Realtime Setup

### Enable Realtime for Tables

1. Go to Supabase Dashboard > Database > Replication
2. Enable replication for:
   - `orders` table
   - `notifications` table (if using)

### Verify Realtime

Test Realtime connection:

```bash
curl http://localhost:3000/api/health/supabase
```

Expected response:
```json
{
  "healthy": true,
  "clientAvailable": true,
  "connectionWorking": true,
  "realtimeEnabled": true,
  "details": {}
}
```

## Storage Setup

### Create Storage Buckets

1. Go to Supabase Dashboard > Storage
2. Create buckets:
   - `document-uploads`: For logos, images
   - `scripts`: For JavaScript files

### Storage Policies

```sql
-- Allow public read access to scripts
CREATE POLICY "Public read access to scripts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'scripts');

-- Allow authenticated uploads to document-uploads
CREATE POLICY "Authenticated uploads to document-uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'document-uploads' AND auth.role() = 'authenticated');
```

## Troubleshooting

### Realtime Not Working

1. **Check Replication**: Ensure tables are enabled in Database > Replication
2. **Check RLS**: Ensure RLS policies allow service role access
3. **Check Network**: Verify `NEXT_PUBLIC_SUPABASE_URL` is accessible
4. **Check Health**: Call `/api/health/supabase` endpoint

### Common Issues

#### "Realtime may not be enabled in Supabase"

- Go to Database > Replication
- Enable replication for required tables
- Wait a few minutes for changes to propagate

#### "Channel error" or "Subscription timeout"

- Check network connectivity
- Verify Supabase project is active
- Check browser console for CORS errors
- Verify environment variables are set correctly

#### "Database column not found"

- Supabase Realtime uses **snake_case** column names
- Ensure database columns match: `sub_status`, `updated_at`, `vendor_id`, etc.
- See `src/lib/realtime/subscriptions.ts` for column mappings

## Fallback Behavior

If Supabase is unavailable or Realtime fails:

1. **Automatic Fallback**: System automatically switches to polling
2. **Polling Interval**: 5 seconds for orders, 10 seconds for vendor orders
3. **Connection State**: UI shows connection mode (realtime vs polling)

## Production Checklist

- [ ] Environment variables set in production
- [ ] RLS policies configured
- [ ] Realtime enabled for required tables
- [ ] Storage buckets created with proper policies
- [ ] Health check endpoint returns healthy status
- [ ] Test Realtime subscriptions in production
- [ ] Monitor connection state in UI

## Additional Resources

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)


