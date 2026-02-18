# iconfont-mcp

MCP server for Iconfont (iconfont.cn) - Search, download, and manage icons from China's largest icon library.

## Features

- **Search Icons**: Search for icons by name with filters for icon types (line, fill, flat, hand-drawn, etc.)
- **Download SVG**: Download icon SVG data and save to files
- **List Projects**: List your Iconfont projects (requires authentication)

## Installation

```bash
npm install -g iconfont-mcp
```

Or use npx directly:

```bash
npx iconfont-mcp
```

## MCP Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "iconfont": {
      "command": "npx",
      "args": ["iconfont-mcp"]
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
- `output_path` (string, optional): Directory to save SVG file
- `filename` (string, optional): Filename without extension
- `response_format` (string, optional): 'markdown' or 'json' (default: markdown)

### iconfont_list_projects

List your Iconfont projects (requires authentication).

**Parameters:**
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
