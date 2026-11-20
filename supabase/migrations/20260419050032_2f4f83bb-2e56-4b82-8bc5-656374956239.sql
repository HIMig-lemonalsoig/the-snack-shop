-- Create snack_requests table for customer suggestions
CREATE TABLE public.snack_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  requester_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.snack_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a request
CREATE POLICY "Anyone can submit requests"
ON public.snack_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(item_name) BETWEEN 1 AND 100
  AND (requester_name IS NULL OR char_length(requester_name) <= 60)
  AND (notes IS NULL OR char_length(notes) <= 500)
);

-- Admins can view all
CREATE POLICY "Admins can view requests"
ON public.snack_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update status
CREATE POLICY "Admins can update requests"
ON public.snack_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete
CREATE POLICY "Admins can delete requests"
ON public.snack_requests
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));