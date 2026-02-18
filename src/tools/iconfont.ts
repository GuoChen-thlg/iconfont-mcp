import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeFileSync } from "fs";
import { resolve } from "path";
import { IconfontService } from "../services/iconfont.js";
import { IconfontLoginService } from "../services/login.js";
import { 
  ResponseFormat, 
  IconType,
  IconfontSearchSchema,
  IconfontDownloadSchema,
  IconfontListProjectsSchema,
  IconfontLoginSchema,
  IconfontAutoLoginSchema,
  IconfontProjectDetailSchema,
  IconfontProjectSearchSchema,
  IconfontSearchInput,
  IconfontDownloadInput,
  IconfontListProjectsInput,
  IconfontLoginInput,
  IconfontAutoLoginInput,
  IconfontProjectDetailInput,
  IconfontProjectSearchInput,
  IconfontIcon
} from "../types.js";

const CHARACTER_LIMIT = 25000;

function formatMarkdownSearchResult(
  query: string,
  total: number,
  page: number,
  pageSize: number,
  icons: Array<{ icon_id: string; name: string; show_svg: string }>
): string {
  const lines: string[] = [
    `# Icon Search Results: "${query}"`,
    "",
    `Found **${total}** icons (showing ${icons.length} on page ${page})`,
    ""
  ];

  for (const icon of icons) {
    lines.push(`## ${icon.name}`);
    lines.push(`- **ID**: ${icon.icon_id}`);
    lines.push(`- **SVG Preview**: ${icon.show_svg ? "Available" : "Not available"}`);
    lines.push("");
  }

  const hasMore = total > page * pageSize;
  if (hasMore) {
    lines.push(`> More results available. Use page=${page + 1} to see more.`);
  }

  return lines.join("\n");
}

function formatMarkdownProjects(
  projects: Array<{ id: string; name: string; icon_count: number; updated_at: string }>
): string {
  const lines: string[] = [
    "# Your Iconfont Projects",
    ""
  ];

  if (projects.length === 0) {
    lines.push("No projects found.");
    return lines.join("\n");
  }

  for (const project of projects) {
    lines.push(`## ${project.name}`);
    lines.push(`- **ID**: ${project.id}`);
    lines.push(`- **Icons**: ${project.icon_count}`);
    lines.push(`- **Updated**: ${new Date(project.updated_at).toLocaleDateString()}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function createIconfontTools(server: McpServer, service: IconfontService) {
  server.registerTool(
    "iconfont_search_icons",
    {
      title: "Search Iconfont Icons",
      description: `Search for icons in the Iconfont icon library (iconfont.cn).

This tool searches the Iconfont database for icons matching the specified query. It provides access to millions of icons from various designers and collections.

Args:
  - query (string, required): Search query for icon name
  - icon_type (string, optional): Icon style type - '' for all, 'line' for outline, 'fill' for filled, 'flat' for flat, 'hand' for hand-drawn, 'simple' for simple, 'complex' for elaborate (default: all)
  - page (number, optional): Page number for pagination, starting from 1 (default: 1)
  - page_size (number, optional): Number of results per page, max 100 (default: 54)
  - response_format ('markdown' | 'json', optional): Output format (default: markdown)

Returns:
  For JSON format: { total: number, page: number, page_size: number, icons: [...] }
  For markdown: Human-readable list with icon names and IDs

Examples:
  - Use when: "Find home icons" -> query="home"
  - Use when: "Search outline-style arrows" -> query="arrow", icon_type="line"
  - Use when: "Get page 2 of search results" -> query="user", page=2`,
      inputSchema: IconfontSearchSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: IconfontSearchInput) => {
      try {
        const result = await service.searchIcons(
          params.query,
          params.icon_type,
          params.page,
          params.page_size
        );

        if (result.icons.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No icons found for "${params.query}". Try a different search term.`
            }]
          };
        }

        let textContent: string;
        const structuredContent = {
          total: result.total,
          page: result.page,
          page_size: result.page_size,
          icons: result.icons.map((icon: IconfontIcon) => ({
            icon_id: icon.icon_id,
            name: icon.name,
            svg_preview: icon.show_svg
          }))
        };

        if (params.response_format === ResponseFormat.JSON) {
          textContent = JSON.stringify(structuredContent, null, 2);
        } else {
          textContent = formatMarkdownSearchResult(
            params.query,
            result.total,
            result.page,
            result.page_size,
            result.icons
          );

          if (textContent.length > CHARACTER_LIMIT) {
            textContent = textContent.substring(0, CHARACTER_LIMIT) + 
              "\n\n... (response truncated due to size)";
          }
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`
          }]
        };
      }
    }
  );

  server.registerTool(
    "iconfont_download_icon",
    {
      title: "Download Iconfont Icon SVG",
      description: `Download SVG data for a specific icon from Iconfont.

This tool retrieves the SVG content for an icon and optionally saves it to a file. The icon_id can be obtained from the search results.

Args:
  - icon_id (string, required): The icon ID to download (from search results)
  - output_path (string, optional): Directory path to save the SVG file
  - filename (string, optional): Filename for the downloaded SVG (without extension)

Returns:
  For JSON format: { icon_id: string, name: string, svg: string, saved_to: string | null }
  For markdown: Confirmation message with file path if saved

Examples:
  - Use when: "Download the home icon" -> icon_id from search results
  - Use when: "Save to specific folder" -> output_path="./src/icons"`,
      inputSchema: IconfontDownloadSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: IconfontDownloadInput) => {
      try {
        const icon = await service.getIconDetail(params.icon_id);
        
        if (!icon) {
          return {
            content: [{
              type: "text",
              text: `Error: Icon with ID "${params.icon_id}" not found.`
            }]
          };
        }

        let savedPath: string | null = null;
        
        if (params.output_path || params.filename) {
          const filename = params.filename || icon.name || params.icon_id;
          const outputDir = params.output_path || process.cwd();
          const filePath = resolve(outputDir, `${filename}.svg`);
          
          writeFileSync(filePath, icon.svg || icon.show_svg);
          savedPath = filePath;
        }

        const output = {
          icon_id: icon.icon_id,
          name: icon.name,
          svg: icon.svg || icon.show_svg,
          saved_to: savedPath
        };

        let textContent: string;
        if (params.response_format === ResponseFormat.JSON) {
          textContent = JSON.stringify(output, null, 2);
        } else {
          textContent = savedPath 
            ? `Icon "${icon.name}" (ID: ${icon.icon_id}) saved to: ${savedPath}`
            : `Icon "${icon.name}" (ID: ${icon.icon_id})`;
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`
          }]
        };
      }
    }
  );

  server.registerTool(
    "iconfont_list_projects",
    {
      title: "List Iconfont Projects",
      description: `List all projects in the user's Iconfont account.

This tool requires authentication via Iconfont cookie. It returns all projects that the user has created or has access to.

Args:
  - cookie (string, optional): The EGG_SESS_ICONFONT cookie from iconfont.cn. Can be used instead of setting environment variable.
  - response_format ('markdown' | 'json', optional): Output format (default: markdown)

Returns:
  For JSON format: { projects: [{ id, name, icon_count, updated_at }] }
  For markdown: Human-readable list of projects

Note: Requires authentication. Can provide cookie via args, ICONFONT_COOKIE environment variable, or iconfont_login tool.
Cookie can be obtained from browser dev tools after logging into iconfont.cn.

Examples:
  - Use when: "See all my icon projects"
  - Use when: "Find project ID for a specific project"`,
      inputSchema: IconfontListProjectsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: IconfontListProjectsInput) => {
      try {
        const projects = await service.listProjects(params.cookie);

        const structuredContent = { projects };

        let textContent: string;
        if (params.response_format === ResponseFormat.JSON) {
          textContent = JSON.stringify(structuredContent, null, 2);
        } else {
          textContent = formatMarkdownProjects(projects);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`
          }]
        };
      }
    }
  );

  server.registerTool(
    "iconfont_login",
    {
      title: "Login to Iconfont",
      description: `Authenticate with Iconfont using browser cookie.

This tool allows you to login to your Iconfont account to access private projects and features that require authentication.

Args:
  - cookie (string, required): The EGG_SESS_ICONFONT cookie value from iconfont.cn

How to get the cookie:
1. Log in to https://www.iconfont.cn/
2. Open browser DevTools (F12)
3. Go to Application/Storage → Cookies → https://www.iconfont.cn
4. Copy the value of "EGG_SESS_ICONFONT" cookie

Returns:
  - Success or error message

Note: The cookie is stored in memory only and will be lost when the server restarts.
For persistent login, set ICONFONT_COOKIE environment variable instead.

Examples:
  - Use when: "Login to access my private projects"`,
      inputSchema: IconfontLoginSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: IconfontLoginInput) => {
      try {
        service.setCookie(params.cookie);
        
        const status = service.getLoginStatus();
        
        return {
          content: [{
            type: "text",
            text: `Successfully logged in to Iconfont!\n\nYou can now use iconfont_list_projects to see your projects.`
          }],
          structuredContent: { success: true, ...status }
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Failed to login"}`
          }]
        };
      }
    }
  );

  server.registerTool(
    "iconfont_auto_login",
    {
      title: "Auto Login to Iconfont (Browser)",
      description: `Automatically open browser to log in to Iconfont and obtain authentication cookie.

This tool will:
1. Try to open browser using Puppeteer
2. If Puppeteer fails, use system command to open browser
3. Let you log in manually in the browser
4. Automatically detect when login is successful
5. Store the authentication cookie for future API calls

Returns:
  - Success message with login status

Note: This opens a real browser for secure login. The browser will close automatically after login.
This tool may take longer to complete as it waits for manual login.

Examples:
  - Use when: "I want to log in without manually copying cookie"`,
      inputSchema: IconfontAutoLoginSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => {
      const loginService = new IconfontLoginService();
      
      try {
        await loginService.startLogin();
        
        const cookie = await loginService.waitForLogin(120000);
        
        if (cookie) {
          service.setCookie(cookie);
          const status = service.getLoginStatus();
          
          return {
            content: [{
              type: "text",
              text: `✅ Successfully logged in to Iconfont!\n\nYou can now use iconfont_list_projects to see your projects.`
            }],
            structuredContent: { success: true, ...status }
          };
        } else {
          return {
            content: [{
              type: "text",
              text: `Login timeout. Please try again.`
            }]
          };
        }
      } catch (error) {
        await loginService.close();
        return {
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Failed to login"}`
          }]
        };
      }
    }
  );

  server.registerTool(
    "iconfont_check_login",
    {
      title: "Check Login Status",
      description: `Check if currently logged in to Iconfont.

Returns:
  - Current login status and whether a cookie is available`,
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => {
      const status = service.getLoginStatus();
      
      return {
        content: [{
          type: "text",
          text: status.loggedIn 
            ? "✅ Currently logged in to Iconfont"
            : "❌ Not logged in. Use iconfont_login or iconfont_auto_login to authenticate."
        }],
        structuredContent: status
      };
    }
  );

  server.registerTool(
    "iconfont_get_project_detail",
    {
      title: "Get Iconfont Project Detail",
      description: `Get detailed information about a specific Iconfont project.

This tool retrieves project details including name, icon count, font family, etc.
Results are cached for 5 minutes based on the project's update time to reduce API calls.

Args:
  - cookie (string, optional): The EGG_SESS_ICONFONT cookie from iconfont.cn. Can be used instead of setting environment variable.
  - pid (string, required): Project ID (can be obtained from iconfont_list_projects)
  - response_format ('markdown' | 'json', optional): Output format (default: markdown)

Returns:
  Project details including id, name, icon_count, font_family, created_at, updated_at

Examples:
  - Use when: "Get details of project 1997925" -> pid="1997925"`,
      inputSchema: IconfontProjectDetailSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: IconfontProjectDetailInput) => {
      try {
        const detail = await service.getProjectDetail(params.pid, params.cookie);
        
        const output = {
          id: detail.id,
          name: detail.name,
          icon_count: detail.icon_count,
          font_family: detail.font_family,
          created_at: detail.created_at,
          updated_at: detail.updated_at,
          username: detail.username
        };

        let textContent: string;
        if (params.response_format === ResponseFormat.JSON) {
          textContent = JSON.stringify(output, null, 2);
        } else {
          textContent = [
            `# Project: ${detail.name}`,
            "",
            `| Field | Value |`,
            `|-------|-------|`,
            `| ID | ${detail.id} |`,
            `| Font Family | ${detail.font_family} |`,
            `| Created | ${new Date(detail.created_at).toLocaleString()} |`,
            `| Updated | ${new Date(detail.updated_at).toLocaleString()} |`,
            `| Username | ${detail.username || '-'} |`
          ].join("\n");
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`
          }]
        };
      }
    }
  );

  server.registerTool(
    "iconfont_project_search_icons",
    {
      title: "Search Icons in Iconfont Project",
      description: `Search for icons within a specific Iconfont project using keyword.

This tool searches icons inside a specific project that the user has access to.
Requires authentication via Iconfont cookie.

Args:
  - cookie (string, optional): The EGG_SESS_ICONFONT cookie from iconfont.cn. Can be used instead of setting environment variable.
  - pid (string, required): Project ID (can be obtained from iconfont_list_projects)
  - keyword (string, required): Keyword to search for icons within the project
  - page (number, optional): Page number for pagination (default: 1)
  - response_format ('markdown' | 'json', optional): Output format (default: markdown)

Returns:
  For JSON format: { total: number, page: number, icons: [...] }
  For markdown: Human-readable list with icon names and IDs

Note: Requires authentication. Can provide cookie via args, ICONFONT_COOKIE environment variable, or iconfont_login tool.

Examples:
  - Use when: "Search copy icons in project 1997925" -> pid="1997925", keyword="copy"
  - Use when: "Search text formatting icons in my project" -> pid="123456", keyword="text"`,
      inputSchema: IconfontProjectSearchSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: IconfontProjectSearchInput) => {
      try {
        const result = await service.searchProjectIcons(
          params.pid,
          params.keyword,
          params.cookie,
          params.page
        );

        if (result.icons.length === 0) {
          return {
            content: [{
              type: "text",
              text: `No icons found for keyword "${params.keyword}" in project ${params.pid}.`
            }]
          };
        }

        const structuredContent = {
          total: result.total,
          page: result.page,
          icons: result.icons.map((icon: IconfontIcon) => ({
            icon_id: icon.icon_id,
            name: icon.name,
            svg_preview: icon.show_svg
          }))
        };

        let textContent: string;
        if (params.response_format === ResponseFormat.JSON) {
          textContent = JSON.stringify(structuredContent, null, 2);
        } else {
          textContent = formatMarkdownSearchResult(
            params.keyword,
            result.total,
            result.page,
            result.page_size,
            result.icons
          );

          if (textContent.length > CHARACTER_LIMIT) {
            textContent = textContent.substring(0, CHARACTER_LIMIT) + 
              "\n\n... (response truncated due to size)";
          }
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`
          }]
        };
      }
    }
  );
}
