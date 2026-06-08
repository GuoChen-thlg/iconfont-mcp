# icon-font-mcp

MCP server for Iconfont (iconfont.cn) - Search, download, and manage icons from China's largest icon library.

## Features

- **Search Icons**: Search for icons by name with filters for icon types (line, fill, flat, hand-drawn, etc.)
- **Download SVG**: Download icon SVG data and save to files
- **List Projects**: List your Iconfont projects (requires authentication)

## Installation

### Global install

```bash
npm install guochen-thlg/icon-font-mcp -g
```

### Run with npx

```bash
npx -y guochen-thlg/iconfont-mcp
```

### Local run

Clone the repo and run directly:

```bash
git clone https://github.com/GuoChen-thlg/iconfont-mcp.git
cd iconfont-mcp
pnpm install && pnpm build
node dist/index.js
```

## MCP Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "iconfont": {
      "command": "npx",
      "args": ["-y", "guochen-thlg/iconfont-mcp"]
    }
  }
}
```

### With Authentication

For features requiring authentication (like listing projects), set the `ICONFONT_COOKIE` environment variable:

```bash
export ICONFONT_COOKIE="your-iconfont-cookie"
```

To get the cookie:
1. Log in to https://www.iconfont.cn/
2. Open browser DevTools (F12)
3. Go to Application/Storage → Cookies
4. Copy the `EGG_SESS_ICONFONT` cookie value

## Available Tools

### iconfont_search_icons

Search for icons in the Iconfont library.

**Parameters:**
- `query` (string, required): Search query for icon name
- `icon_type` (string, optional): Icon style type - '' (all), 'line', 'fill', 'flat', 'hand', 'simple', 'complex'
- `page` (number, optional): Page number (default: 1)
- `page_size` (number, optional): Results per page, max 100 (default: 54)
- `response_format` (string, optional): 'markdown' or 'json' (default: markdown)

### iconfont_download_icon

Download SVG data for a specific icon.

**Parameters:**
- `icon_id` (string, required): Icon ID from search results
- `project_id` (string, optional): Project ID for icons in private projects
- `output_path` (string, optional): Directory to save SVG file
- `filename` (string, optional): Filename without extension
- `response_format` (string, optional): 'markdown' or 'json' (default: markdown)

### iconfont_list_projects

List your Iconfont projects (requires authentication).

**Parameters:**
- `cookie` (string, optional): Iconfont cookie override
- `response_format` (string, optional): 'markdown' or 'json' (default: markdown)

### iconfont_login

Login to Iconfont by providing a cookie.

**Parameters:**
- `cookie` (string, required): The `EGG_SESS_ICONFONT` cookie value

### iconfont_auto_login

Auto login by opening a browser for manual authentication.

**Parameters:** None (opens a browser window automatically)

### iconfont_check_login

Check if you are currently logged in with a valid cookie.

**Parameters:** None

### iconfont_get_project_detail

Get detailed info about a specific project.

**Parameters:**
- `pid` (string, required): Project ID
- `cookie` (string, optional): Iconfont cookie override
- `response_format` (string, optional): 'markdown' or 'json' (default: markdown)

### iconfont_project_search_icons

Search icons within a specific project.

**Parameters:**
- `pid` (string, required): Project ID
- `keyword` (string, required): Search keyword
- `cookie` (string, optional): Iconfont cookie override
- `page` (number, optional): Page number (default: 1)
- `response_format` (string, optional): 'markdown' or 'json' (default: markdown)

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Run in development mode
pnpm run dev
```

## License

MIT
