import { adminOnly, json } from "../_shared/admin.ts";

const EMAIL_RE = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/;

Deno.serve(adminOnly(async ({ req, admin, body }) => {
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const makeAdmin = body.make_admin === true;

  if (email.length > 254 || !EMAIL_RE.test(email)) return json(req, { error: "Enter a valid email address." }, 400);
  if (password.length < 10) return json(req, { error: "Password must be at least 10 characters." }, 400);
  if (password.length > 72) return json(req, { error: "Password must be 72 characters or fewer." }, 400);

  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    return json(req, { error: exists ? "That email already has an account." : "Couldn't create that account." }, exists ? 409 : 400);
  }

  const newUserId = created.user.id;
  if (makeAdmin) {
    const { error: roleErr } = await admin.from("user_roles")
      .upsert({ user_id: newUserId, role: "admin" }, { onConflict: "user_id,role" });
    if (roleErr) {
      console.error(roleErr);
      return json(req, { error: "Account created, but granting admin failed. Promote them from the list." }, 500);
    }
  }
  return json(req, { success: true, user_id: newUserId, email });
}));
