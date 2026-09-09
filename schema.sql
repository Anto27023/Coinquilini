-- ====================================================================
-- COINQUILINI — SCHEMA DATABASE SUPABASE COMPLETO & IDEMPOTENTE
-- Istruzioni: Incolla ed esegui interamente questo script nell'SQL Editor
-- di Supabase (https://app.supabase.com -> tuo progetto -> SQL Editor).
-- È sicuro eseguirlo più volte (è completamente idempotente).
-- ====================================================================

-- 1. ABILITAZIONE ESTENSIONI NECESSARIE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 2. TABELLA PROFILI UTENTE (collegata a auth.users)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  iban TEXT,
  paypal TEXT,
  revolut TEXT,
  satispay TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attiva RLS su profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy per profiles (rimuove prima se già presenti)
DROP POLICY IF EXISTS "I profili sono visibili a tutti gli utenti autenticati" ON public.profiles;
CREATE POLICY "I profili sono visibili a tutti gli utenti autenticati"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Ogni utente può aggiornare il proprio profilo" ON public.profiles;
CREATE POLICY "Ogni utente può aggiornare il proprio profilo"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Ogni utente può inserire il proprio profilo" ON public.profiles;
CREATE POLICY "Ogni utente può inserire il proprio profilo"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Trigger per creare automaticamente il profilo quando si registra un utente in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1), 'Coinquilino'),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill per creare profili di utenti auth già registrati prima di questo script
INSERT INTO public.profiles (id, full_name, email)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', SPLIT_PART(email, '@', 1), 'Coinquilino'), 
  COALESCE(email, '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 3. TABELLA CASE (houses)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  features JSONB DEFAULT '{"rent": true, "bills": true, "groceries": true, "products": true, "guests": true, "bathroom": true, "rules": true, "shopping_list": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 4. TABELLA MEMBRI CASA (house_members)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.house_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner' o 'member'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.house_members ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 5. FUNZIONI HELPER SECURITY DEFINER (Per evitare ricorsioni RLS)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.is_house_member(p_house_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.house_members
    WHERE house_id = p_house_id AND user_id = auth.uid()
  ) INTO v_exists;
  RETURN COALESCE(v_exists, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off;

CREATE OR REPLACE FUNCTION public.get_user_house_id()
RETURNS UUID AS $$
DECLARE
  v_house_id UUID;
BEGIN
  SELECT house_id INTO v_house_id
  FROM public.house_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN v_house_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off;

-- Policy su HOUSES e HOUSE_MEMBERS
DROP POLICY IF EXISTS "Le info della casa sono visibili ai suoi membri" ON public.houses;
CREATE POLICY "Le info della casa sono visibili ai suoi membri"
  ON public.houses FOR SELECT
  TO authenticated
  USING (public.is_house_member(id));

DROP POLICY IF EXISTS "Il proprietario può aggiornare le impostazioni della casa" ON public.houses;
CREATE POLICY "Il proprietario può aggiornare le impostazioni della casa"
  ON public.houses FOR UPDATE
  TO authenticated
  USING (public.is_house_member(id))
  WITH CHECK (public.is_house_member(id));

DROP POLICY IF EXISTS "I membri della casa vedono gli altri componenti" ON public.house_members;
CREATE POLICY "I membri della casa vedono gli altri componenti"
  ON public.house_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_house_member(house_id));

-- ====================================================================
-- 6. RPC: CREAZIONE CASA ED INGRESSO TRAMITE CODICE INVITO
-- ====================================================================

-- Generazione codice invito unico FS-XXXXXX
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := 'FS-';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- RPC per creare una nuova casa
CREATE OR REPLACE FUNCTION public.create_house(p_name TEXT, p_features JSONB)
RETURNS JSONB AS $$
DECLARE
  v_house_id UUID;
  v_invite_code TEXT;
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utente non autenticato';
  END IF;

  -- Assicura che esista il profilo per l'utente prima di procedere
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    v_user_id,
    COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id), 'Coinquilino'),
    COALESCE((SELECT email FROM auth.users WHERE id = v_user_id), '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Verifica che l'utente non appartenga già a una casa
  IF EXISTS (SELECT 1 FROM public.house_members WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'Appartieni già a una casa. Devi prima uscirne per crearne una nuova.';
  END IF;

  -- Genera codice univoco
  LOOP
    v_invite_code := public.generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.houses WHERE invite_code = v_invite_code);
  END LOOP;

  -- Inserisci casa
  INSERT INTO public.houses (name, invite_code, created_by, features)
  VALUES (p_name, v_invite_code, v_user_id, COALESCE(p_features, '{}'::jsonb))
  RETURNING id INTO v_house_id;

  -- Inserisci utente come owner
  INSERT INTO public.house_members (house_id, user_id, role)
  VALUES (v_house_id, v_user_id, 'owner');

  SELECT json_build_object('house_id', v_house_id, 'invite_code', v_invite_code)::jsonb INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off;

-- RPC per entrare in una casa con codice
CREATE OR REPLACE FUNCTION public.join_house(p_invite_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_house_id UUID;
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utente non autenticato';
  END IF;

  -- Assicura che esista il profilo per l'utente
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    v_user_id,
    COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = v_user_id), 'Coinquilino'),
    COALESCE((SELECT email FROM auth.users WHERE id = v_user_id), '')
  )
  ON CONFLICT (id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.house_members WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'Appartieni già a una casa.';
  END IF;

  SELECT id INTO v_house_id FROM public.houses WHERE UPPER(invite_code) = UPPER(TRIM(p_invite_code));

  IF v_house_id IS NULL THEN
    RAISE EXCEPTION 'Codice invito non valido. Verifica il codice e riprova.';
  END IF;

  INSERT INTO public.house_members (house_id, user_id, role)
  VALUES (v_house_id, v_user_id, 'member');

  SELECT json_build_object('house_id', v_house_id)::jsonb INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off;

-- RPC per abbandonare la propria casa
CREATE OR REPLACE FUNCTION public.leave_house()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utente non autenticato';
  END IF;

  DELETE FROM public.house_members WHERE user_id = v_user_id;

  SELECT json_build_object('success', true)::jsonb INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off;


-- ====================================================================
-- 7. TABELLE DATI DELLA CASA & POLICY RLS
-- ====================================================================

-- A) SPESE (expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  paid_by UUID NOT NULL REFERENCES public.profiles(id),
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutto per i membri della casa su expenses" ON public.expenses;
CREATE POLICY "Tutto per i membri della casa su expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (public.is_house_member(house_id))
  WITH CHECK (public.is_house_member(house_id));

-- PARTECIPANTI ALLA SPESA (expense_participants)
CREATE TABLE IF NOT EXISTS public.expense_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id)
);
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membri della casa vedono e gestiscono partecipanti spesa" ON public.expense_participants;
CREATE POLICY "Membri della casa vedono e gestiscono partecipanti spesa"
  ON public.expense_participants FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id AND public.is_house_member(e.house_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_id AND public.is_house_member(e.house_id)
    )
  );

-- RIMBORSI/PAREGGI DI CONTO (settlements)
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES public.profiles(id),
  receiver_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membri gestiscono i rimborsi" ON public.settlements;
CREATE POLICY "Membri gestiscono i rimborsi"
  ON public.settlements FOR ALL TO authenticated
  USING (public.is_house_member(house_id))
  WITH CHECK (public.is_house_member(house_id));


-- B) SCADENZE (deadlines)
CREATE TABLE IF NOT EXISTS public.deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT 'Casa',
  priority TEXT NOT NULL DEFAULT 'media', -- 'bassa', 'media', 'alta'
  notes TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membri gestiscono le scadenze" ON public.deadlines;
CREATE POLICY "Membri gestiscono le scadenze"
  ON public.deadlines FOR ALL TO authenticated
  USING (public.is_house_member(house_id))
  WITH CHECK (public.is_house_member(house_id));


-- C) TURNI DI PULIZIA (tasks)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  frequency TEXT NOT NULL DEFAULT 'Settimanale', -- 'Giornaliero', 'Settimanale', 'Ogni 2 settimane', 'Mensile', 'Quando serve'
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  last_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membri gestiscono i turni" ON public.tasks;
CREATE POLICY "Membri gestiscono i turni"
  ON public.tasks FOR ALL TO authenticated
  USING (public.is_house_member(house_id))
  WITH CHECK (public.is_house_member(house_id));


-- D) LISTA DELLA SPESA (shopping_list_items)
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity TEXT,
  requested_by UUID REFERENCES public.profiles(id),
  is_purchased BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membri gestiscono la lista della spesa" ON public.shopping_list_items;
CREATE POLICY "Membri gestiscono la lista della spesa"
  ON public.shopping_list_items FOR ALL TO authenticated
  USING (public.is_house_member(house_id))
  WITH CHECK (public.is_house_member(house_id));


-- E) PRENOTAZIONI BAGNO (bathroom_slots)
CREATE TABLE IF NOT EXISTS public.bathroom_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  date DATE NOT NULL,
  start_time TEXT NOT NULL, -- es. "08:30"
  duration_minutes INT NOT NULL CHECK (duration_minutes >= 5 AND duration_minutes <= 240),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.bathroom_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membri gestiscono i turni bagno" ON public.bathroom_slots;
CREATE POLICY "Membri gestiscono i turni bagno"
  ON public.bathroom_slots FOR ALL TO authenticated
  USING (public.is_house_member(house_id))
  WITH CHECK (public.is_house_member(house_id));


-- F) OSPITI (guests)
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  host_id UUID NOT NULL REFERENCES public.profiles(id),
  date DATE NOT NULL,
  stays_overnight BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membri gestiscono gli ospiti" ON public.guests;
CREATE POLICY "Membri gestiscono gli ospiti"
  ON public.guests FOR ALL TO authenticated
  USING (public.is_house_member(house_id))
  WITH CHECK (public.is_house_member(house_id));


-- G) REGOLE DELLA CASA (rules)
CREATE TABLE IF NOT EXISTS public.rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  rule_text TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membri gestiscono le regole" ON public.rules;
CREATE POLICY "Membri gestiscono le regole"
  ON public.rules FOR ALL TO authenticated
  USING (public.is_house_member(house_id))
  WITH CHECK (public.is_house_member(house_id));


-- H) BACHECA MESSAGGI (board_messages)
CREATE TABLE IF NOT EXISTS public.board_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.board_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membri leggono e scrivono messaggi in bacheca" ON public.board_messages;
CREATE POLICY "Membri leggono e scrivono messaggi in bacheca"
  ON public.board_messages FOR ALL TO authenticated
  USING (public.is_house_member(house_id))
  WITH CHECK (public.is_house_member(house_id));


-- I) NOTIFICHE INTERNE (notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "L'utente legge solo le proprie notifiche" ON public.notifications;
DROP POLICY IF EXISTS "L'utente visualizza le proprie notifiche" ON public.notifications;
CREATE POLICY "L'utente visualizza le proprie notifiche"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "L'utente aggiorna le proprie notifiche" ON public.notifications;
CREATE POLICY "L'utente aggiorna le proprie notifiche"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "L'utente elimina le proprie notifiche" ON public.notifications;
CREATE POLICY "L'utente elimina le proprie notifiche"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- I membri della casa possono inviare notifiche ai coinquilini della stessa casa
DROP POLICY IF EXISTS "Membri possono inviare notifiche nella casa" ON public.notifications;
CREATE POLICY "Membri possono inviare notifiche nella casa"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_house_member(house_id));


-- ====================================================================
-- 8. ABILITAZIONE REALTIME DI SUPABASE (Sicura ed Idempotente)
-- Per aggiornare in tempo reale la dashboard di tutti i coinquilini
-- ====================================================================
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'expenses', 
    'settlements', 
    'deadlines', 
    'tasks', 
    'shopping_list_items', 
    'bathroom_slots', 
    'guests', 
    'rules', 
    'board_messages', 
    'notifications',
    'house_members',
    'houses',
    'profiles'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY tables LOOP
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      EXCEPTION 
        WHEN duplicate_object THEN
          -- Già presente nella pubblicazione, ignora
          NULL;
        WHEN OTHERS THEN
          NULL;
      END;
    END LOOP;
  END IF;
END $$;
