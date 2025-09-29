/*
  # Create custom storage schema and tables for document management

  1. New Schema
    - Create custom 'file_storage' schema for managing uploaded files
    
  2. New Tables
    - Create buckets table for managing storage buckets
    - Create objects table for storing file metadata
    
  3. Security
    - Add RLS policies for authenticated users
*/

-- Create custom schema for file storage
CREATE SCHEMA IF NOT EXISTS file_storage;

-- Create buckets table
CREATE TABLE IF NOT EXISTS file_storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create objects table
CREATE TABLE IF NOT EXISTS file_storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL REFERENCES file_storage.buckets(id),
  name text NOT NULL,
  size bigint,
  mime_type text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  owner_id uuid REFERENCES auth.users(id),
  UNIQUE (bucket_id, name)
);

-- Insert documents bucket
INSERT INTO file_storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on buckets
ALTER TABLE file_storage.buckets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on objects
ALTER TABLE file_storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read buckets
CREATE POLICY "Allow authenticated users to read buckets"
ON file_storage.buckets
FOR SELECT TO authenticated
USING (true);

-- Policy to allow authenticated users to read objects
CREATE POLICY "Allow authenticated users to read objects"
ON file_storage.objects
FOR SELECT TO authenticated
USING (true);

-- Policy to allow authenticated users to insert objects
CREATE POLICY "Allow authenticated users to insert objects"
ON file_storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy to allow authenticated users to update their objects
CREATE POLICY "Allow authenticated users to update objects"
ON file_storage.objects
FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

-- Policy to allow authenticated users to delete their objects
CREATE POLICY "Allow authenticated users to delete objects"
ON file_storage.objects
FOR DELETE TO authenticated
USING (owner_id = auth.uid());