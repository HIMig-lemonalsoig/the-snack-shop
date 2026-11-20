import { adminOnly, json } from "../_shared/admin.ts";

Deno.serve(adminOnly(async ({ req, admin }) => {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;

  const { data: roles, error: rolesErr } = await admin.from("user_roles").select("user_id, role").eq("role", "admin");
  if (rolesErr) throw rolesErr;
  const admins = new Set((roles ?? []).map((r) => r.user_id));

  // Return only what the Team screen shows.
  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    is_admin: admins.has(u.id),
  }));
  return json(req, { users });
}));
