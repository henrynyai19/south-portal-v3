INSERT INTO storage.buckets (id, name, public)
VALUES ('report-attachments', 'report-attachments', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;
