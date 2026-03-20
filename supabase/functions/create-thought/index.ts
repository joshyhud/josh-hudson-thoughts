import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";

type Payload = {
  title: string;
  description: string;
  pubDate?: string;
  heroImage?: string;
  tags?: string[];
  body: string;
  slug?: string;
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function escapeYaml(value: string) {
  return String(value).replace(/"/g, '\\"');
}

function formatDate(input?: string) {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  return new Date().toISOString().slice(0, 10);
}

function buildMarkdown({
  title,
  description,
  pubDate,
  heroImage,
  tags,
  body,
}: {
  title: string;
  description: string;
  pubDate: string;
  heroImage?: string;
  tags: string[];
  body: string;
}) {
  return [
    "---",
    `title: "${escapeYaml(title)}"`,
    `description: "${escapeYaml(description)}"`,
    `pubDate: ${pubDate}`,
    "draft: false",
    heroImage ? `heroImage: "${escapeYaml(heroImage)}"` : null,
    "tags:",
    "  - Thought",
    "---",
    "",
    body,
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

function toBase64Utf8(input: string) {
  return btoa(unescape(encodeURIComponent(input)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as Payload;

    if (!payload.title?.trim()) {
      return new Response(JSON.stringify({ error: "Title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payload.description?.trim()) {
      return new Response(
        JSON.stringify({ error: "Description is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!payload.body?.trim()) {
      return new Response(JSON.stringify({ error: "Body is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const githubOwner = Deno.env.get("GITHUB_OWNER");
    const githubRepo = Deno.env.get("GITHUB_REPO");
    const githubBranch = Deno.env.get("GITHUB_BRANCH") || "main";
    const githubContentDir =
      Deno.env.get("GITHUB_CONTENT_DIR") || "src/content/blog";

    if (!githubToken || !githubOwner || !githubRepo) {
      return new Response(
        JSON.stringify({ error: "Missing GitHub environment variables" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const slug = payload.slug?.trim() || slugify(payload.title);
    const pubDate = formatDate(payload.pubDate);
    const tags = Array.isArray(payload.tags)
      ? payload.tags.map((t) => String(t).trim()).filter(Boolean)
      : ["Post"];

    const markdown = buildMarkdown({
      title: payload.title.trim(),
      description: payload.description.trim(),
      pubDate,
      heroImage: payload.heroImage?.trim() || "",
      tags,
      body: payload.body,
    });

    const path = `${githubContentDir}/${slug}.md`;

    const githubRes = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          message: `Create draft thought: ${slug}`,
          content: toBase64Utf8(markdown),
          branch: githubBranch,
        }),
      },
    );

    const githubData = await githubRes.json();

    if (!githubRes.ok) {
      return new Response(
        JSON.stringify({
          error: "GitHub write failed",
          status: githubRes.status,
          github_message: githubData.message || null,
          details: githubData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        slug,
        path,
        draft: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
