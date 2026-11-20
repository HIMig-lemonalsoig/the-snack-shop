-- Allow admins to delete sales records
CREATE POLICY "Admins can delete sales"
ON public.sales
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));