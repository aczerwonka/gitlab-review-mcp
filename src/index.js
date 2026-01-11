#!/usr/bin/env node
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
var types_js_1 = require("@modelcontextprotocol/sdk/types.js");
// Konfiguracja z ENV
var GITLAB_BASE_URL = process.env.GITLAB_BASE_URL;
var GITLAB_TOKEN = process.env.GITLAB_TOKEN;
if (!GITLAB_BASE_URL || !GITLAB_TOKEN) {
    console.error("ERROR: GITLAB_BASE_URL and GITLAB_TOKEN environment variables are required");
    process.exit(1);
}
// GitLab API Client
var GitLabClient = /** @class */ (function () {
    function GitLabClient(baseUrl, token) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.token = token;
    }
    GitLabClient.prototype.request = function (endpoint_1) {
        return __awaiter(this, arguments, void 0, function (endpoint, options) {
            var url, response, errorText, error_1;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        url = "".concat(this.baseUrl, "/api/v4").concat(endpoint);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        return [4 /*yield*/, fetch(url, __assign(__assign({}, options), { headers: __assign({ "PRIVATE-TOKEN": this.token, "Content-Type": "application/json" }, options.headers) }))];
                    case 2:
                        response = _a.sent();
                        if (!!response.ok) return [3 /*break*/, 4];
                        return [4 /*yield*/, response.text()];
                    case 3:
                        errorText = _a.sent();
                        throw new Error("GitLab API error (".concat(response.status, "): ").concat(errorText));
                    case 4: return [4 /*yield*/, response.json()];
                    case 5: return [2 /*return*/, _a.sent()];
                    case 6:
                        error_1 = _a.sent();
                        console.error("GitLab API request failed: ".concat(url), error_1);
                        throw error_1;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    GitLabClient.prototype.getMergeRequest = function (projectId, mrIid) {
        return __awaiter(this, void 0, void 0, function () {
            var mr;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        return [4 /*yield*/, this.request("/projects/".concat(encodeURIComponent(projectId), "/merge_requests/").concat(mrIid))];
                    case 1:
                        mr = _a.sent();
                        return [2 /*return*/, {
                                title: mr.title,
                                description: mr.description || "",
                                state: mr.state,
                                author: {
                                    username: mr.author.username,
                                    name: mr.author.name,
                                },
                                web_url: mr.web_url,
                            }];
                }
            });
        });
    };
    GitLabClient.prototype.getMergeRequestDiff = function (projectId, mrIid) {
        return __awaiter(this, void 0, void 0, function () {
            var diffs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        return [4 /*yield*/, this.request("/projects/".concat(encodeURIComponent(projectId), "/merge_requests/").concat(mrIid, "/changes")).then(function (response) { return response.changes || []; })];
                    case 1:
                        diffs = _a.sent();
                        return [2 /*return*/, {
                                files: diffs.map(function (diff) { return ({
                                    old_path: diff.old_path,
                                    new_path: diff.new_path,
                                    diff: diff.diff,
                                    new_file: diff.new_file,
                                    deleted_file: diff.deleted_file,
                                    renamed_file: diff.renamed_file,
                                }); }),
                            }];
                }
            });
        });
    };
    GitLabClient.prototype.postMergeRequestComment = function (projectId, mrIid, body) {
        return __awaiter(this, void 0, void 0, function () {
            var comment;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        return [4 /*yield*/, this.request("/projects/".concat(encodeURIComponent(projectId), "/merge_requests/").concat(mrIid, "/notes"), {
                                method: "POST",
                                body: JSON.stringify({ body: body }),
                            })];
                    case 1:
                        comment = _a.sent();
                        return [2 /*return*/, {
                                comment_id: comment.id,
                                created_at: comment.created_at,
                            }];
                }
            });
        });
    };
    return GitLabClient;
}());
// MCP Server Setup
var server = new index_js_1.Server({
    name: "gitlab-review-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
var gitlabClient = new GitLabClient(GITLAB_BASE_URL, GITLAB_TOKEN);
// Define tools
var tools = [
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
server.setRequestHandler(types_js_1.ListToolsRequestSchema, function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, {
                tools: tools,
            }];
    });
}); });
// Handle call_tool request
server.setRequestHandler(types_js_1.CallToolRequestSchema, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, args, _b, project_id, mr_iid, result, _c, project_id, mr_iid, result, _d, project_id, mr_iid, body, result, error_2, errorMessage;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _a = request.params, name = _a.name, args = _a.arguments;
                _e.label = 1;
            case 1:
                _e.trys.push([1, 8, , 9]);
                if (!(name === "get_merge_request")) return [3 /*break*/, 3];
                _b = args, project_id = _b.project_id, mr_iid = _b.mr_iid;
                if (!project_id || typeof project_id !== "string") {
                    throw new Error("project_id must be a non-empty string");
                }
                if (!mr_iid || typeof mr_iid !== "number") {
                    throw new Error("mr_iid must be a number");
                }
                return [4 /*yield*/, gitlabClient.getMergeRequest(project_id, mr_iid)];
            case 2:
                result = _e.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(result, null, 2),
                            },
                        ],
                    }];
            case 3:
                if (!(name === "get_merge_request_diff")) return [3 /*break*/, 5];
                _c = args, project_id = _c.project_id, mr_iid = _c.mr_iid;
                if (!project_id || typeof project_id !== "string") {
                    throw new Error("project_id must be a non-empty string");
                }
                if (!mr_iid || typeof mr_iid !== "number") {
                    throw new Error("mr_iid must be a number");
                }
                return [4 /*yield*/, gitlabClient.getMergeRequestDiff(project_id, mr_iid)];
            case 4:
                result = _e.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(result, null, 2),
                            },
                        ],
                    }];
            case 5:
                if (!(name === "post_merge_request_comment")) return [3 /*break*/, 7];
                _d = args, project_id = _d.project_id, mr_iid = _d.mr_iid, body = _d.body;
                if (!project_id || typeof project_id !== "string") {
                    throw new Error("project_id must be a non-empty string");
                }
                if (!mr_iid || typeof mr_iid !== "number") {
                    throw new Error("mr_iid must be a number");
                }
                if (!body || typeof body !== "string") {
                    throw new Error("body must be a non-empty string");
                }
                return [4 /*yield*/, gitlabClient.postMergeRequestComment(project_id, mr_iid, body)];
            case 6:
                result = _e.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(result, null, 2),
                            },
                        ],
                    }];
            case 7: throw new Error("Unknown tool: ".concat(name));
            case 8:
                error_2 = _e.sent();
                errorMessage = error_2 instanceof Error ? error_2.message : String(error_2);
                console.error("Error executing tool ".concat(name, ":"), errorMessage);
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({ error: errorMessage }, null, 2),
                            },
                        ],
                        isError: true,
                    }];
            case 9: return [2 /*return*/];
        }
    });
}); });
// Start server
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var transport;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    transport = new stdio_js_1.StdioServerTransport();
                    return [4 /*yield*/, server.connect(transport)];
                case 1:
                    _a.sent();
                    console.error("GitLab Review MCP Server started");
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error("Fatal error:", error);
    process.exit(1);
});
