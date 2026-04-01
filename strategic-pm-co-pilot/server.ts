import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Linear API Integration (Proof of Concept)
  app.post("/api/linear/create-issue", async (req, res) => {
    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "LINEAR_API_KEY is not configured in environment." });
    }

    const { title, description, priority, label } = req.body;

    // Linear GraphQL Mutation
    const teamIdentifier = process.env.LINEAR_TEAM_ID;
    if (!teamIdentifier) {
      return res.status(500).json({ error: "LINEAR_TEAM_ID is not configured in environment." });
    }

    try {
      // 1. Resolve Team UUID from Identifier (e.g., "ENG")
      const teamQuery = `
        query GetTeam($id: String!) {
          team(id: $id) {
            id
          }
        }
      `;
      
      const teamResponse = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": apiKey.startsWith('lin_api_') ? apiKey : `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          query: teamQuery,
          variables: { id: teamIdentifier }
        })
      });

      const teamResult: any = await teamResponse.json();
      if (teamResult.errors || !teamResult.data?.team?.id) {
        console.error("Linear Team Resolution Error:", teamResult.errors);
        return res.status(400).json({ error: `Could not find Linear team with identifier "${teamIdentifier}". Check your LINEAR_TEAM_ID.` });
      }

      const teamId = teamResult.data.team.id;

      // 2. Create the Issue using the resolved UUID
      const issueMutation = `
        mutation IssueCreate($title: String!, $description: String!, $priority: Int!, $teamId: String!) {
          issueCreate(input: {
            title: $title,
            description: $description,
            priority: $priority,
            teamId: $teamId
          }) {
            success
            issue {
              id
              url
            }
          }
        }
      `;

      const issueResponse = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": apiKey.startsWith('lin_api_') ? apiKey : `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          query: issueMutation,
          variables: { title, description, priority, teamId }
        })
      });

      const result: any = await issueResponse.json();
      
      if (result.errors) {
        console.error("Linear GraphQL Errors:", JSON.stringify(result.errors, null, 2));
        return res.status(400).json({ error: result.errors[0].message });
      }

      if (!result.data?.issueCreate?.success) {
        return res.status(400).json({ error: "Failed to create issue in Linear." });
      }

      res.json(result.data.issueCreate);
    } catch (error) {
      console.error("Linear API Connection Error:", error);
      res.status(500).json({ error: "Failed to connect to Linear API. Check your network and API key." });
    }
  });

  // OAuth Callback Route for Google Drive
  app.get("/auth/callback", (req, res) => {
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              // Extract token from hash if present (Implicit Flow)
              const hash = window.location.hash.substring(1);
              const params = new URLSearchParams(hash);
              const accessToken = params.get('access_token');
              const error = params.get('error');
              
              if (accessToken) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', accessToken }, '*');
              } else if (error) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error }, '*');
              } else {
                // Fallback for code flow
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', code }, '*');
              }
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication complete. You can close this window.</p>
        </body>
      </html>
    `);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
