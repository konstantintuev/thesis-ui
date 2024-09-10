CREATE VIEW public.profiles_public_view AS
SELECT user_id, username, display_name, image_url
FROM public.profiles;

GRANT SELECT ON public.profiles_public_view TO authenticated;
