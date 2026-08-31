-- Stage 5 Notification & Engagement System

-- 1. push_tokens
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL,
    platform TEXT NOT NULL,
    device_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, expo_push_token)
);

-- RLS: Users can manage their own tokens.
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push tokens"
    ON public.push_tokens FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
    ON public.push_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
    ON public.push_tokens FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
    ON public.push_tokens FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON public.push_tokens(is_active) WHERE is_active = true;

-- 2. notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN NOT NULL DEFAULT false,
    study_reminders BOOLEAN NOT NULL DEFAULT true,
    streak_reminders BOOLEAN NOT NULL DEFAULT true,
    weak_topic_reminders BOOLEAN NOT NULL DEFAULT true,
    achievement_notifications BOOLEAN NOT NULL DEFAULT true,
    exam_countdown_notifications BOOLEAN NOT NULL DEFAULT true,
    content_notifications BOOLEAN NOT NULL DEFAULT true,
    system_notifications BOOLEAN NOT NULL DEFAULT true,
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Users can manage their own preferences.
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
    ON public.notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON public.notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON public.notification_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. notification_events (for deduplication and history)
CREATE TABLE IF NOT EXISTS public.notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    dedupe_key TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    status TEXT NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, dedupe_key)
);

-- RLS: Users can only SELECT their own events.
-- Writes are handled by Edge Functions acting with service_role.
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification events"
    ON public.notification_events FOR SELECT
    USING (auth.uid() = user_id);

-- (Edge functions bypass RLS so they can insert and update rows without explicit policies)

CREATE INDEX idx_notification_events_user_id ON public.notification_events(user_id);
CREATE INDEX idx_notification_events_dedupe_key ON public.notification_events(dedupe_key);
