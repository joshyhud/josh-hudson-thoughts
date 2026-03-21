import { supabase } from "../../lib/supabase.ts";

const form = document.getElementById("thought-form");
const message = document.getElementById("message");
const logoutBtn = document.getElementById("logout-btn");

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function checkUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    window.location.href = import.meta.env.BASE_URL + "/login";
    return;
  }
}

await checkUser();

logoutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = import.meta.env.BASE_URL + "login";
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "Publishing...";

  const formData = new FormData(form);

  const title = String(formData.get("title") || "");
  const description = String(formData.get("description") || "");
  const pubDate = String(formData.get("pubDate") || "");
  const body = String(formData.get("body") || "");
  const tags = String(formData.get("tags") || "Post")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const slug = slugify(title);

  let imageData = null;
  const image = formData.get("image");

  if (image instanceof File && image.size > 0) {
    const ext = image.name.split(".").pop()?.toLowerCase() || "jpg";
    const imageName = `${slug}-${Date.now()}.${ext}`;
    const buffer = await image.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((s, b) => s + String.fromCharCode(b), ""),
    );
    imageData = {
      base64,
      name: imageName,
      type: image.type,
    };
  }

  const payload = {
    title,
    description,
    pubDate,
    heroImage: imageData ? `./img/${imageData.name}` : "",
    tags,
    body,
    slug,
    imageData,
  };

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("create-thought", {
      body: payload,
    });

    console.log("Response data:", data);
    console.log("Response error:", error);

    if (error) {
      const context = error.context;
      if (context instanceof Response) {
        const text = await context.text();
        console.error("Edge function response body:", text);
        try {
          const json = JSON.parse(text);
          message.textContent = json.error || error.message;
        } catch {
          message.textContent = `${error.message}: ${text}`;
        }
      } else {
        message.textContent = error.message;
      }
      return;
    }

    message.textContent = `Published ${data?.path || ""}`;
    form.reset();
  } catch (err) {
    console.error("Edge function call failed:", err);
    message.textContent = `Request failed: ${err.message}`;
  }
});
