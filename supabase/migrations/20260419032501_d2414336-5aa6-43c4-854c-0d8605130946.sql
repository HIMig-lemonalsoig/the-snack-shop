CREATE TYPE public.snack_category AS ENUM ('drinks', 'chips', 'candy', 'cookies', 'other');

ALTER TABLE public.snacks
ADD COLUMN category public.snack_category NOT NULL DEFAULT 'other';