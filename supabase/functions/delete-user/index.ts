import { adminOnly, json, UUID_RE } from "../_shared/admin.ts";

Deno.serve(adminOnly(async ({ req, caller, admin, body }) => {
  let userId = typeof body.user_id === "string" ? body.user_id : undefined;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;

  if (!userId && email) {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (!userId) return json(req, { error: "No user found with that email." }, 404);
  }
  if (!userId || !UUID_RE.test(userId)) return json(req, { error: "A valid user is required." }, 400);
  if (userId === caller.id) return json(req, { error: "You can't delete your own account." }, 400);

  // Remove roles first; the protect_last_admin trigger blocks removing the final admin.
  const { error: rolesErr } = await admin.from("user_roles").delete().eq("user_id", userId);
  if (rolesErr) {
    if (/last admin/i.test(rolesErr.message)) return json(req, { error: "You can't delete the last admin." }, 400);
    throw rolesErr;
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error(error);
    return json(req, { error: "Couldn't delete that account." }, 400);
  }
  return json(req, { success: true, user_id: userId });
}));
