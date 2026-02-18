#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { IconfontService } from "./services/iconfont.js";
import { createIconfontTools } from "./tools/iconfont.js";

const server = new McpServer({
  name: "iconfont-mcp",
  version: "1.0.0"
});

const iconfontService = new IconfontService();

createIconfontTools(server, iconfontService);

async function main() {
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  
  console.error("Iconfont MCP server running via stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
