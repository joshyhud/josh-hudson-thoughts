import { supabase } from "../../lib/supabase";

const form = document.getElementById("login-form");
const message = document.getElementById("message");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  message.textContent = "Signing in...";

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    message.textContent = error.message;
    return;
  }

  window.location.href = "/josh-hudson-thoughts/admin/new-thought";
});
