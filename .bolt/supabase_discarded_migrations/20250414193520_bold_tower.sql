/*
  # Create documents storage bucket

  1. New Storage Bucket
    - Create 'documents' bucket for storing uploaded files
    - Enable public access for authenticated users
    
  2. Security
    - Add policies for authenticated users to:
      - Upload files
      - Download files
      - Update files
      - Delete files
*/

-- Enable storage if not already enabled
create extension if not exists "storage" schema "extensions";

-- Create the documents bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Policy to allow authenticated users to upload files
create policy "Allow authenticated users to upload files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'documents');

-- Policy to allow authenticated users to download files
create policy "Allow authenticated users to download files"
on storage.objects for select
to authenticated
using (bucket_id = 'documents');

-- Policy to allow authenticated users to update their files
create policy "Allow authenticated users to update files"
on storage.objects for update
to authenticated
using (bucket_id = 'documents');

-- Policy to allow authenticated users to delete their files
create policy "Allow authenticated users to delete files"
on storage.objects for delete
to authenticated
using (bucket_id = 'documents');