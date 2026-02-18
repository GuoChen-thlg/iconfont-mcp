import { z } from "zod";

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

export enum IconType {
  ALL = "",
  LINE = "line",
  FILL = "fill",
  FLAT = "flat",
  HAND = "hand",
  SIMPLE = "simple",
  COMPLEX = "complex"
}

export const IconfontSearchSchema = z.object({
  query: z.string()
    .min(1, "Search query is required")
    .max(200, "Query must not exceed 200 characters")
    .describe("Search query for icon name"),
  icon_type: z.nativeEnum(IconType)
    .default(IconType.ALL)
    .describe("Icon style type: empty for all, 'line' for outline, 'fill' for filled, 'flat' for flat, 'hand' for hand-drawn, 'simple' for simple, 'complex' for elaborate"),
  page: z.number()
    .int()
    .min(1)
    .default(1)
    .describe("Page number for pagination"),
  page_size: z.number()
    .int()
    .min(1)
    .max(100)
    .default(54)
    .describe("Number of results per page (max 100)"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();

export type IconfontSearchInput = z.infer<typeof IconfontSearchSchema>;

export const IconfontDownloadSchema = z.object({
  icon_id: z.string()
    .describe("The icon ID to download (from search results)"),
  output_path: z.string()
    .optional()
    .describe("Directory path to save the SVG file (defaults to current directory)"),
  filename: z.string()
    .optional()
    .describe("Filename for the downloaded SVG (without extension)"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();

export type IconfontDownloadInput = z.infer<typeof IconfontDownloadSchema>;

export const IconfontListProjectsSchema = z.object({
  cookie: z.string()
    .optional()
    .describe("The EGG_SESS_ICONFONT cookie from iconfont.cn. Can be used instead of setting environment variable."),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();

export type IconfontListProjectsInput = z.infer<typeof IconfontListProjectsSchema>;

export const IconfontLoginSchema = z.object({
  cookie: z.string()
    .describe("The EGG_SESS_ICONFONT cookie value from iconfont.cn. Get this from browser DevTools after logging in.")
}).strict();

export type IconfontLoginInput = z.infer<typeof IconfontLoginSchema>;

export const IconfontAutoLoginSchema = z.object({}).strict();

export type IconfontAutoLoginInput = z.infer<typeof IconfontAutoLoginSchema>;

export interface IconfontIcon {
  icon_id: string;
  name: string;
  show_svg: string;
  svg: string;
  font_class?: string;
  unicode?: string;
  tags?: string[];
}

export interface IconfontSearchResult {
  total: number;
  page: number;
  page_size: number;
  icons: IconfontIcon[];
}

export interface IconfontProject {
  id: string;
  name: string;
  icon_count: number;
  updated_at: string;
}

export interface IconfontProjectDetail {
  id: string;
  name: string;
  icon_count: number;
  font_family: string;
  created_at: string;
  updated_at: string;
  username?: string;
}

export const IconfontProjectDetailSchema = z.object({
  cookie: z.string()
    .optional()
    .describe("The EGG_SESS_ICONFONT cookie from iconfont.cn. Can be used instead of setting environment variable."),
  pid: z.string().describe("Project ID"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for 'machine-readable'")
}).strict();

export type IconfontProjectDetailInput = z.infer<typeof IconfontProjectDetailSchema>;

export const IconfontProjectSearchSchema = z.object({
  cookie: z.string()
    .optional()
    .describe("The EGG_SESS_ICONFONT cookie from iconfont.cn. Can be used instead of setting environment variable."),
  pid: z.string().describe("Project ID (can be obtained from iconfont_list_projects)"),
  keyword: z.string()
    .min(1, "Keyword is required")
    .max(200, "Keyword must not exceed 200 characters")
    .describe("Keyword to search for icons within the project"),
  page: z.number()
    .int()
    .min(1)
    .default(1)
    .describe("Page number for pagination"),
  response_format: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();

export type IconfontProjectSearchInput = z.infer<typeof IconfontProjectSearchSchema>;
