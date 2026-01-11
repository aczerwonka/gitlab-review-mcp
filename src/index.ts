#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
// Konfiguracja z ENV
const GITLAB_BASE_URL = process.env.GITLAB_BASE_URL;
const GITLAB_TOKEN = process.env.GITLAB_TOKEN;
if (!GITLAB_BASE_URL || !GITLAB_TOKEN) {
  console.error("ERROR: GITLAB_BASE_URL and GITLAB_TOKEN environment variables are required");
  process.exit(1);
}
// GitLab API Client
class GitLabClient {
  private baseUrl: string;
  private token: string;
  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
  }
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/v4${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "PRIVATE-TOKEN": this.token,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitLab API error (${response.status}): ${errorText}`);
      }
      return await response.json() as T;
    } catch (error) {
      console.error(`GitLab API request failed: ${url}`, error);
      throw error;
    }
  }
  async getMergeRequest(projectId: string, mrIid: number) {
    interface MRResponse {
      id: number;
      iid: number;
      title: string;
      description: string;
      state: string;
      author: {
        id: number;
        username: string;
        name: string;
      };
      web_url: string;
    }
    const mr = await this.request<MRResponse>(
      `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}`
    );
    return {
      title: mr.title,
      description: mr.description || "",
      state: mr.state,
      author: {
        username: mr.author.username,
        name: mr.author.name,
      },
      web_url: mr.web_url,
    };
  }
  async getMergeRequestDiff(projectId: string, mrIid: number) {
    interface DiffResponse {
      old_path: string;
      new_path: string;
      diff: string;
      new_file: boolean;
      deleted_file: boolean;
      renamed_file: boolean;
    }
    const diffs = await this.request<DiffResponse[]>(
      `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/changes`
    ).then((response: any) => response.changes || []);
    return {
      files: diffs.map((diff: DiffResponse) => ({
        old_path: diff.old_path,
        new_path: diff.new_path,
        diff: diff.diff,
        new_file: diff.new_file,
        deleted_file: diff.deleted_file,
        renamed_file: diff.renamed_file,
      })),
    };
  }
  async postMergeRequestComment(projectId: string, mrIid: number, body: string) {
    interface CommentResponse {
      id: number;
      created_at: string;
      body: string;
      author: {
        username: string;
        name: string;
      };
    }
    const comment = await this.request<CommentResponse>(
      `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/notes`,
      {
        method: "POST",
        body: JSON.stringify({ body }),
      }
    );
    return {
      comment_id: comment.id,
      created_at: comment.created_at,
    };
  }
}
// MCP Server Setup
const server = new Server(
  {
    name: "gitlab-review-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
const gitlabClient = new GitLabClient(GITLAB_BASE_URL, GITLAB_TOKEN);
// Define tools
const tools: Tool[] = [
  {
    name: "get_merge_request",
    description: "Get details of a GitLab merge request including title, description, state, author, and web URL",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "GitLab project ID or path (e.g., 'group/project' or '123')",
        },
        mr_iid: {
          type: "number",
          description: "Merge request IID (internal ID visible in GitLab UI)",
        },
      },
      required: ["project_id", "mr_iid"],
    },
  },
  {
    name: "get_merge_request_diff",
    description: "Get the diff/changes of a GitLab merge request showing all modified files and their diffs",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "GitLab project ID or path (e.g., 'group/project' or '123')",
        },
        mr_iid: {
          type: "number",
          description: "Merge request IID (internal ID visible in GitLab UI)",
        },
      },
      required: ["project_id", "mr_iid"],
    },
  },
  {
    name: "post_merge_request_comment",
    description: "Post a comment/note on a GitLab merge request",
    inputSchema: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "GitLab project ID or path (e.g., 'group/project' or '123')",
        },
        mr_iid: {
          type: "number",
          description: "Merge request IID (internal ID visible in GitLab UI)",
        },
        body: {
          type: "string",
          description: "The comment text/body to post (supports Markdown)",
        },
      },
      required: ["project_id", "mr_iid", "body"],
    },
  },
];
// Handle list_tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});
// Handle call_tool request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    if (name === "get_merge_request") {
      const { project_id, mr_iid } = args as { project_id: string; mr_iid: number };
      if (!project_id || typeof project_id !== "string") {
        throw new Error("project_id must be a non-empty string");
      }
      if (!mr_iid || typeof mr_iid !== "number") {
        throw new Error("mr_iid must be a number");
      }
      const result = await gitlabClient.getMergeRequest(project_id, mr_iid);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
    if (name === "get_merge_request_diff") {
      const { project_id, mr_iid } = args as { project_id: string; mr_iid: number };
      if (!project_id || typeof project_id !== "string") {
        throw new Error("project_id must be a non-empty string");
      }
      if (!mr_iid || typeof mr_iid !== "number") {
        throw new Error("mr_iid must be a number");
      }
      const result = await gitlabClient.getMergeRequestDiff(project_id, mr_iid);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
    if (name === "post_merge_request_comment") {
      const { project_id, mr_iid, body } = args as { 
        project_id: string; 
        mr_iid: number; 
        body: string 
      };
      if (!project_id || typeof project_id !== "string") {
        throw new Error("project_id must be a non-empty string");
      }
      if (!mr_iid || typeof mr_iid !== "number") {
        throw new Error("mr_iid must be a number");
      }
      if (!body || typeof body !== "string") {
        throw new Error("body must be a non-empty string");
      }
      const result = await gitlabClient.postMergeRequestComment(project_id, mr_iid, body);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error executing tool ${name}:`, errorMessage);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }
});
// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitLab Review MCP Server started");
}
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
