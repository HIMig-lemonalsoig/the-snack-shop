import { adminOnly, json, UUID_RE } from "../_shared/admin.ts";

Deno.serve(adminOnly(async ({ req, caller, admin, body }) => {
  const userId = typeof body.user_id === "string" ? body.user_id : "";
  const action = body.action;
  if (!UUID_RE.test(userId) || (action !== "promote" && action !== "demote")) {
    return json(req, { error: "Invalid request" }, 400);
  }

  if (action === "promote") {
    const { data: target } = await admin.auth.admin.getUserById(userId);
    if (!target?.user) return json(req, { error: "That user no longer exists." }, 404);
    const { error } = await admin.from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw error;
  } else {
    if (userId === caller.id) return json(req, { error: "You can't remove your own admin access." }, 400);
    const { error } = await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    if (error) {
      if (/last admin/i.test(error.message)) return json(req, { error: "You can't remove the last admin." }, 400);
      throw error;
    }
  }
  return json(req, { ok: true });
}));
