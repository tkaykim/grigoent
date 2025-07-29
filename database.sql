-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.career_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  category text NOT NULL CHECK (category = ANY (ARRAY['choreography'::text, 'performance'::text, 'advertisement'::text, 'tv'::text, 'workshop'::text])),
  title text NOT NULL,
  video_url text,
  poster_url text,
  is_featured boolean DEFAULT false,
  description text,
  country text DEFAULT 'Korea'::text,
  start_date date,
  end_date date,
  created_at timestamp with time zone DEFAULT now(),
  date_type text DEFAULT 'range'::text CHECK (date_type = ANY (ARRAY['single'::text, 'range'::text])),
  single_date date,
  updated_at timestamp with time zone DEFAULT now(),
  linked_user_id uuid,
  CONSTRAINT career_entries_pkey PRIMARY KEY (id),
  CONSTRAINT career_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT career_entries_linked_user_id_fkey FOREIGN KEY (linked_user_id) REFERENCES public.users(id)
);
CREATE TABLE public.display_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (item_type = ANY (ARRAY['artist'::text, 'team'::text])),
  item_id uuid NOT NULL,
  display_order integer NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT display_order_items_pkey PRIMARY KEY (id)
);
CREATE TABLE public.proposal_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  proposal_id uuid,
  sender_id uuid,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT proposal_messages_pkey PRIMARY KEY (id),
  CONSTRAINT proposal_messages_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id),
  CONSTRAINT proposal_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id)
);
CREATE TABLE public.proposal_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  proposal_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['new_proposal'::text, 'proposal_accepted'::text, 'proposal_rejected'::text, 'new_message'::text, 'status_updated'::text, 'project_started'::text, 'project_completed'::text])),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT proposal_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT proposal_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT proposal_notifications_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id)
);
CREATE TABLE public.proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  dancer_id uuid,
  title text NOT NULL,
  description text NOT NULL,
  project_type text NOT NULL CHECK (project_type = ANY (ARRAY['choreography'::text, 'performance'::text, 'advertisement'::text, 'tv'::text, 'workshop'::text, 'other'::text])),
  budget_min integer,
  budget_max integer,
  start_date date,
  end_date date,
  location text,
  requirements text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'expired'::text, 'consulting'::text, 'scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT proposals_pkey PRIMARY KEY (id),
  CONSTRAINT proposals_dancer_id_fkey FOREIGN KEY (dancer_id) REFERENCES public.users(id),
  CONSTRAINT proposals_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id)
);
CREATE TABLE public.seo_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  setting_type text DEFAULT 'text'::text CHECK (setting_type = ANY (ARRAY['text'::text, 'textarea'::text, 'url'::text, 'image'::text])),
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seo_settings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.team_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  user_id uuid,
  activity_type text CHECK (activity_type = ANY (ARRAY['member_joined'::text, 'member_left'::text, 'project_created'::text, 'project_updated'::text, 'invitation_sent'::text, 'invitation_accepted'::text, 'invitation_declined'::text])),
  description text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_activities_pkey PRIMARY KEY (id),
  CONSTRAINT team_activities_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.team_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  inviter_id uuid,
  invitee_email text NOT NULL,
  role text DEFAULT 'member'::text CHECK (role = ANY (ARRAY['member'::text, 'leader'::text])),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'expired'::text])),
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT team_invitations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_invitations_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES public.users(id)
);
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  user_id uuid,
  role text DEFAULT 'member'::text CHECK (role = ANY (ARRAY['leader'::text, 'member'::text, 'invited'::text])),
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_members_pkey PRIMARY KEY (id),
  CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.team_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  title text NOT NULL,
  description text,
  project_type text CHECK (project_type = ANY (ARRAY['choreography'::text, 'performance'::text, 'advertisement'::text, 'tv'::text, 'workshop'::text])),
  status text DEFAULT 'planning'::text CHECK (status = ANY (ARRAY['planning'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  start_date date,
  end_date date,
  budget_min integer,
  budget_max integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_projects_pkey PRIMARY KEY (id),
  CONSTRAINT team_projects_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  logo_url text,
  cover_image text,
  leader_id uuid,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  display_order integer,
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text NOT NULL,
  email text UNIQUE,
  phone text,
  profile_image text,
  slug text NOT NULL UNIQUE,
  type text DEFAULT 'general'::text CHECK (type = ANY (ARRAY['general'::text, 'dancer'::text, 'client'::text, 'manager'::text, 'admin'::text])),
  pending_type text CHECK (pending_type = ANY (ARRAY['dancer'::text, 'client'::text])),
  display_order integer,
  introduction text,
  instagram_url text,
  twitter_url text,
  youtube_url text,
  created_at timestamp with time zone DEFAULT now(),
  is_virtual boolean DEFAULT false,
  claim_user_id uuid,
  claim_status text CHECK (claim_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text])),
  claim_reason text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);