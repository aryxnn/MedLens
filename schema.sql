-- MedLens Database Schemas
-- Copy and paste this script into your Supabase SQL Editor (https://supabase.com) to create the tables.

-- Create profiles table that links to Supabase auth.users
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  age integer not null,
  gender text not null,
  weight numeric(5,2),
  medical_conditions text[] default '{}'::text[],
  active_medications text[] default '{}'::text[],
  allergies text[] default '{}'::text[],
  blood_type text
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Create diagnoses table
create table if not exists public.diagnoses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  symptoms text not null,
  severity text not null,
  duration text not null,
  triage_level text not null,
  recommendations jsonb not null,
  drug_warnings jsonb not null,
  urgent_attention boolean default false not null,
  raw_transcript jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for diagnoses
alter table public.diagnoses enable row level security;

-- Policies for diagnoses
create policy "Users can view own diagnoses" on public.diagnoses
  for select using (auth.uid() = user_id);

create policy "Users can insert own diagnoses" on public.diagnoses
  for insert with check (auth.uid() = user_id);

-- Enable pgvector extension
create extension if not exists vector;

-- Create documents table for NHS Conditions RAG
create table if not exists public.nhs_documents (
  id bigserial primary key,
  content text not null,
  url text not null,
  metadata jsonb,
  embedding vector(768)
);

-- Index for vector search performance
create index if not exists nhs_docs_embedding_idx on public.nhs_documents using hnsw (embedding vector_cosine_ops);

-- Stored procedure for cosine vector similarity searches (deduplicated by URL)
create or replace function match_nhs_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  content text,
  url text,
  metadata jsonb,
  similarity float
)
language plpgsql stable
as $$
begin
  return query
  with unique_docs as (
    select distinct on (url)
      nhs_documents.content,
      nhs_documents.url,
      nhs_documents.metadata,
      1 - (nhs_documents.embedding <=> query_embedding) as similarity
    from nhs_documents
    where 1 - (nhs_documents.embedding <=> query_embedding) > match_threshold
    order by url, nhs_documents.embedding <=> query_embedding asc
  )
  select * from unique_docs
  order by similarity desc
  limit match_count;
end;
$$;

