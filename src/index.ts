#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
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

  async postMergeRequestInlineComment(
    projectId: string,
    mrIid: number,
    body: string,
    filePath: string,
    lineNumber: number,
    lineType: "new" | "old" = "new"
  ) {
    interface InlineCommentResponse {
      id: number;
      created_at: string;
      body: string;
      position: {
        base_sha: string;
        start_sha: string;
        head_sha: string;
        old_path: string;
        new_path: string;
        position_type: string;
        old_line: number | null;
        new_line: number | null;
      };
      author: {
        username: string;
        name: string;
      };
    }

    // First, get the MR details to obtain SHA information
    const mr = await this.request<any>(
      `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}`
    );

    // Create position object for inline comment
    const position = {
      base_sha: mr.diff_refs.base_sha,
      start_sha: mr.diff_refs.start_sha,
      head_sha: mr.diff_refs.head_sha,
      position_type: "text",
      old_path: filePath,
      new_path: filePath,
      old_line: lineType === "old" ? lineNumber : null,
      new_line: lineType === "new" ? lineNumber : null,
    };

    const comment = await this.request<InlineCommentResponse>(
      `/projects/${encodeURIComponent(projectId)}/merge_requests/${mrIid}/discussions`,
      {
        method: "POST",
        body: JSON.stringify({
          body,
          position,
        }),
      }
    );

    return {
      comment_id: comment.id,
      created_at: comment.created_at,
      file_path: filePath,
      line_number: lineNumber,
      line_type: lineType,
    };
  }

  // Review workflow methods
  async ensureReviewDir(workspaceRoot: string): Promise<string> {
    const reviewDir = path.join(workspaceRoot, ".gitlab_review");
    await fs.mkdir(reviewDir, { recursive: true });

    // Dodaj .gitlab_review do .gitignore jeśli nie istnieje
    const gitignorePath = path.join(workspaceRoot, ".gitignore");
    try {
      const gitignoreContent = await fs.readFile(gitignorePath, "utf8");
      if (!gitignoreContent.split("\n").some(line => line.trim() === ".gitlab_review")) {
        await fs.appendFile(gitignorePath, "\n.gitlab_review\n");
      }
    } catch {
      // .gitignore nie istnieje - utwórz nowy
      await fs.writeFile(gitignorePath, ".gitlab_review\n");
    }

    return reviewDir;
  }

  async saveDiffWithComments(
    workspaceRoot: string,
    projectId: string,
    mrIid: number
  ): Promise<string> {
    const reviewDir = await this.ensureReviewDir(workspaceRoot);
    const reviewFilePath = path.join(reviewDir, `mr-${mrIid}-review.md`);

    // Pobierz informacje o MR
    const mr = await this.getMergeRequest(projectId, mrIid);
    const diff = await this.getMergeRequestDiff(projectId, mrIid);

    // Generuj plik w formacie Markdown z sekcjami do komentowania
    let content = `# Code Review: MR !${mrIid}\n\n`;
    content += `**Projekt:** ${projectId} | **Autor:** ${mr.author.name} (@${mr.author.username}) | **Status:** ${mr.state}\n`;
    content += `**Tytuł:** ${mr.title}\n`;
    content += `**URL:** ${mr.web_url}\n\n`;
    content += `---\n\n`;
    content += `## Ogólne uwagi do MR\n\n`;
    content += `<!-- Dodaj ogólne komentarze (bez konkretnej linii) w formacie:\n`;
    content += `REVIEW_COMMENT: Treść komentarza [ACCEPT=true]\n`;
    content += `Domyślnie ACCEPT=true oznacza że komentarz zostanie wysłany.\n`;
    content += `-->\n\n`;
    content += `---\n\n`;

    // Dodaj każdy plik z diff
    for (const file of diff.files) {
      content += `## 📄 ${file.new_path}\n\n`;

      if (file.new_file) {
        content += `*Nowy plik*\n\n`;
      } else if (file.deleted_file) {
        content += `*Plik usunięty*\n\n`;
      } else if (file.renamed_file) {
        content += `*Plik przeniesiony z: ${file.old_path}*\n\n`;
      }

      // Dodaj diff z przykładowym komentarzem
      content += `\`\`\`diff\n`;
      content += file.diff;
      content += `\n\`\`\`\n\n`;
      content += `<!-- Dodaj komentarze WEWNĄTRZ bloku diff, nad problematyczną linią:\n`;
      content += `REVIEW_COMMENT: Treść [ACCEPT=true] LINE:42\n`;
      content += `REVIEW_COMMENT: Treść [ACCEPT=true] LINE:42 TYPE:old  (dla usuniętej linii)\n`;
      content += `-->\n\n`;
      content += `---\n\n`;
    }

    await fs.writeFile(reviewFilePath, content, "utf8");
    return reviewFilePath;
  }

  async loadReviewFile(reviewFilePath: string): Promise<any[]> {
    const content = await fs.readFile(reviewFilePath, "utf8");

    const comments: any[] = [];

    // Regex: REVIEW_COMMENT: tekst [ACCEPT=true/false] opcjonalnie LINE:X opcjonalnie TYPE:old/new
    const commentRegex = /REVIEW_COMMENT:\s*(.+?)\s*\[ACCEPT=(true|false)\](?:\s+LINE:(\d+))?(?:\s+TYPE:(old|new))?/gi;

    // Szukamy również kontekstu pliku - ostatni nagłówek pliku przed komentarzem
    const lines = content.split("\n");
    let currentFile = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Wykryj nagłówek pliku: ## 📄 ścieżka/do/pliku
      const fileMatch = line.match(/^##\s+📄\s+(.+)$/);
      if (fileMatch) {
        currentFile = fileMatch[1].trim();
        continue;
      }

      // Wykryj komentarz REVIEW_COMMENT
      const match = commentRegex.exec(line);
      if (match) {
        const body = match[1].trim();
        const accept = match[2].toLowerCase() === "true";
        const lineNumber = match[3] ? parseInt(match[3]) : 0;
        const lineType = match[4] ? match[4] : "new";

        comments.push({
          file_path: currentFile,
          line_number: lineNumber,
          line_type: lineType,
          accept: accept,
          body: body,
        });

        // Reset regex lastIndex for next iteration
        commentRegex.lastIndex = 0;
      }
    }

    return comments;
  }

  async publishAcceptedComments(
    reviewFilePath: string,
    projectId: string,
    mrIid: number
  ): Promise<{ published: number; skipped: number; errors: number }> {
    const comments = await this.loadReviewFile(reviewFilePath);

    let published = 0;
    let skipped = 0;
    let errors = 0;

    for (const comment of comments) {
      if (!comment.accept) {
        skipped++;
        const location = comment.line_number > 0
          ? `${comment.file_path}:${comment.line_number}`
          : "general comment";
        console.error(`Skipped comment for ${location}`);
        continue;
      }

      try {
        // Jeśli ma LINE:X to inline comment, inaczej ogólny komentarz do MR
        if (comment.line_number > 0 && comment.file_path) {
          await this.postMergeRequestInlineComment(
            projectId,
            mrIid,
            comment.body,
            comment.file_path,
            comment.line_number,
            comment.line_type
          );
          published++;
          console.error(`Published inline comment to ${comment.file_path}:${comment.line_number}`);
        } else {
          // Ogólny komentarz bez konkretnej linii
          await this.postMergeRequestComment(projectId, mrIid, comment.body);
          published++;
          console.error(`Published general comment to MR`);
        }
      } catch (error) {
        errors++;
        const location = comment.line_number > 0
          ? `${comment.file_path}:${comment.line_number}`
          : "general comment";
        console.error(`Failed to publish comment to ${location}:`, error);
      }
    }

    return { published, skipped, errors };
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
  {
    name: "post_merge_request_inline_comment",
    description: "Post an inline comment on a specific line in a file within a GitLab merge request. This starts a discussion thread at the specified location in the code.",
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
        file_path: {
          type: "string",
          description: "Path to the file in the repository (e.g., 'src/index.ts')",
        },
        line_number: {
          type: "number",
          description: "Line number where the comment should be placed",
        },
        line_type: {
          type: "string",
          description: "Whether the line is in the new version ('new') or old version ('old') of the file",
          enum: ["new", "old"],
        },
      },
      required: ["project_id", "mr_iid", "body", "file_path", "line_number"],
    },
  },
  {
    name: "save_review_file",
    description: "Download MR diff and create a review file (.gitlab_review/mr-{iid}-review.md) with structured format for adding comments. The file includes diff and comment templates.",
    inputSchema: {
      type: "object",
      properties: {
        workspace_root: {
          type: "string",
          description: "Absolute path to workspace root directory (e.g., '/Users/user/project')",
        },
        project_id: {
          type: "string",
          description: "GitLab project ID or path (e.g., 'group/project' or '123')",
        },
        mr_iid: {
          type: "number",
          description: "Merge request IID (internal ID visible in GitLab UI)",
        },
      },
      required: ["workspace_root", "project_id", "mr_iid"],
    },
  },
  {
    name: "publish_review_comments",
    description: "Parse the review file and publish all comments marked with ACCEPT=true to GitLab as inline comments",
    inputSchema: {
      type: "object",
      properties: {
        review_file_path: {
          type: "string",
          description: "Absolute path to review file (e.g., '/Users/user/project/.gitlab_review/mr-123-review.md')",
        },
        project_id: {
          type: "string",
          description: "GitLab project ID or path (e.g., 'group/project' or '123')",
        },
        mr_iid: {
          type: "number",
          description: "Merge request IID (internal ID visible in GitLab UI)",
        },
      },
      required: ["review_file_path", "project_id", "mr_iid"],
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

    if (name === "post_merge_request_inline_comment") {
      const {
        project_id,
        mr_iid,
        body,
        file_path,
        line_number,
        line_type
      } = args as {
        project_id: string;
        mr_iid: number;
        body: string;
        file_path: string;
        line_number: number;
        line_type?: "new" | "old";
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
      if (!file_path || typeof file_path !== "string") {
        throw new Error("file_path must be a non-empty string");
      }
      if (typeof line_number !== "number" || line_number < 1) {
        throw new Error("line_number must be a positive number");
      }
      if (line_type && line_type !== "new" && line_type !== "old") {
        throw new Error("line_type must be either 'new' or 'old'");
      }

      const result = await gitlabClient.postMergeRequestInlineComment(
        project_id,
        mr_iid,
        body,
        file_path,
        line_number,
        line_type
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === "save_review_file") {
      const {
        workspace_root,
        project_id,
        mr_iid
      } = args as {
        workspace_root: string;
        project_id: string;
        mr_iid: number;
      };

      if (!workspace_root || typeof workspace_root !== "string") {
        throw new Error("workspace_root must be a non-empty string");
      }
      if (!project_id || typeof project_id !== "string") {
        throw new Error("project_id must be a non-empty string");
      }
      if (!mr_iid || typeof mr_iid !== "number") {
        throw new Error("mr_iid must be a number");
      }

      const reviewFilePath = await gitlabClient.saveDiffWithComments(
        workspace_root,
        project_id,
        mr_iid
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              review_file_path: reviewFilePath,
              message: "Review file created successfully. Edit the file to add comments, then use 'publish_review_comments' to post them to GitLab."
            }, null, 2),
          },
        ],
      };
    }

    if (name === "publish_review_comments") {
      const {
        review_file_path,
        project_id,
        mr_iid
      } = args as {
        review_file_path: string;
        project_id: string;
        mr_iid: number;
      };

      if (!review_file_path || typeof review_file_path !== "string") {
        throw new Error("review_file_path must be a non-empty string");
      }
      if (!project_id || typeof project_id !== "string") {
        throw new Error("project_id must be a non-empty string");
      }
      if (!mr_iid || typeof mr_iid !== "number") {
        throw new Error("mr_iid must be a number");
      }

      const result = await gitlabClient.publishAcceptedComments(
        review_file_path,
        project_id,
        mr_iid
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              ...result,
              message: `Published ${result.published} comment(s), skipped ${result.skipped}, errors ${result.errors}`
            }, null, 2),
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
