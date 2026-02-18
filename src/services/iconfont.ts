import axios, { AxiosError } from "axios";
import type { IconfontIcon, IconfontSearchResult, IconfontProject, IconfontProjectDetail } from "../types.js";

const ICONFONT_API_BASE = "https://www.iconfont.cn/api";
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  updatedAt: string;
}

export class IconfontService {
  private cookie: string;
  private loggedIn: boolean = false;
  private projectDetailCache: Map<string, CacheEntry<IconfontProjectDetail>> = new Map();
  private cacheMaxAge: number = 5 * 60 * 1000;

  constructor(cookie?: string) {
    this.cookie = cookie || process.env.ICONFONT_COOKIE || "";
    if (this.cookie) {
      this.loggedIn = true;
    }
  }

  setCookie(cookie: string): void {
    this.cookie = cookie;
    this.loggedIn = true;
  }

  getCookie(): string {
    return this.cookie;
  }

  private getEffectiveCookie(overrideCookie?: string): string {
    return overrideCookie || this.cookie;
  }

  private getHeaders(overrideCookie?: string) {
    const cookie = this.getEffectiveCookie(overrideCookie);
    const cookieValue = cookie.startsWith("EGG_SESS_ICONFONT=") 
      ? cookie 
      : `EGG_SESS_ICONFONT=${cookie}`;
    
    return {
      "User-Agent": USER_AGENT,
      "Accept": "application/json",
      "Referer": "https://www.iconfont.cn/",
      ...(cookie ? { "Cookie": cookieValue } : {})
    };
  }

  isLoggedIn(): boolean {
    return this.loggedIn;
  }

  getLoginStatus(): { loggedIn: boolean; hasCookie: boolean } {
    return {
      loggedIn: this.loggedIn,
      hasCookie: !!this.cookie
    };
  }

  async searchIcons(
    query: string,
    iconType: string = "",
    page: number = 1,
    pageSize: number = 54
  ): Promise<IconfontSearchResult> {
    try {
      const params = new URLSearchParams({
        q: query,
        sortType: "updated_at",
        page: page.toString(),
        pageSize: pageSize.toString(),
        fromCollection: "-1",
        fills: "",
        t: Date.now().toString()
      });

      if (iconType) {
        params.append(iconType, "1");
      }

      const response = await axios.post(
        `${ICONFONT_API_BASE}/icon/search.json`,
        params.toString(),
        {
          headers: {
            ...this.getHeaders(),
            "Content-Type": "application/x-www-form-urlencoded"
          },
          timeout: 30000
        }
      );

      const data = response.data;
      if (!data || !data.data) {
        return { total: 0, page, page_size: pageSize, icons: [] };
      }

      const icons = (data.data.icons || []).map((icon: any) => ({
        icon_id: icon.id?.toString() || icon.icon_id?.toString() || "",
        name: icon.name || "",
        show_svg: icon.show_svg || "",
        svg: icon.svg || icon.show_svg || "",
        font_class: icon.font_class,
        unicode: icon.unicode,
        tags: icon.tags || []
      }));

      return {
        total: data.data.total || 0,
        page,
        page_size: pageSize,
        icons
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error("Authentication failed. Please provide a valid Iconfont cookie.");
        }
        if (error.code === "ECONNABORTED") {
          throw new Error("Request timed out. Please try again.");
        }
      }
      throw new Error(`Failed to search icons: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async getIconDetail(iconId: string): Promise<IconfontIcon | null> {
    try {
      const response = await axios.get(
        `${ICONFONT_API_BASE}/icon/${iconId}.json`,
        {
          headers: this.getHeaders(),
          timeout: 30000
        }
      );

      const data = response.data;
      if (!data || !data.data) {
        return null;
      }

      const icon = data.data;
      return {
        icon_id: icon.id?.toString() || icon.icon_id?.toString() || "",
        name: icon.name || "",
        show_svg: icon.show_svg || "",
        svg: icon.svg || icon.show_svg || "",
        font_class: icon.font_class,
        unicode: icon.unicode,
        tags: icon.tags || []
      };
    } catch (error) {
      throw new Error(`Failed to get icon details: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async listProjects(overrideCookie?: string): Promise<IconfontProject[]> {
    const cookie = this.getEffectiveCookie(overrideCookie);
    if (!cookie) {
      throw new Error("Authentication required. Please provide Iconfont cookie.");
    }

    try {
      const response = await axios.get(
        `${ICONFONT_API_BASE}/user/myprojects.json`,
        {
          params: {
            page: 1,
            t: Date.now()
          },
          headers: this.getHeaders(overrideCookie),
          timeout: 30000
        }
      );

      const data = response.data;
      if (!data || !data.data) {
        return [];
      }

      const ownProjects = data.data.ownProjects || [];
      const corpProjects = data.data.corpProjects || [];
      const allProjects = [...ownProjects, ...corpProjects];

      return allProjects.map((project: any) => ({
        id: project.id?.toString() || "",
        name: project.name || "",
        icon_count: project.icon_count || 0,
        updated_at: project.updated_at || ""
      }));
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error("Authentication failed. Please check your Iconfont cookie.");
        }
      }
      throw new Error(`Failed to list projects: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async getProjectIcons(projectId: string, page: number = 1, pageSize: number = 100): Promise<IconfontSearchResult> {
    if (!this.cookie) {
      throw new Error("Authentication required. Please provide Iconfont cookie.");
    }

    try {
      const response = await axios.get(
        `${ICONFONT_API_BASE}/project/symbols.json`,
        {
          params: {
            id: projectId,
            page,
            pageSize
          },
          headers: this.getHeaders(),
          timeout: 30000
        }
      );

      const data = response.data;
      if (!data || !data.data) {
        return { total: 0, page, page_size: pageSize, icons: [] };
      }

      const icons = (data.data.icons || []).map((icon: any) => ({
        icon_id: icon.id?.toString() || icon.icon_id?.toString() || "",
        name: icon.name || "",
        show_svg: icon.show_svg || "",
        svg: icon.svg || icon.show_svg || "",
        font_class: icon.font_class,
        unicode: icon.unicode,
        tags: icon.tags || []
      }));

      return {
        total: data.data.total || 0,
        page,
        page_size: pageSize,
        icons
      };
    } catch (error) {
      throw new Error(`Failed to get project icons: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async getProjectDetail(projectId: string, overrideCookie?: string, forceRefresh: boolean = false): Promise<IconfontProjectDetail> {
    const cookie = this.getEffectiveCookie(overrideCookie);
    if (!cookie) {
      throw new Error("Authentication required. Please provide Iconfont cookie.");
    }

    const cacheKey = projectId;
    const cached = this.projectDetailCache.get(cacheKey);
    const now = Date.now();

    if (!forceRefresh && cached) {
      const cacheAge = now - cached.timestamp;
      if (cacheAge < this.cacheMaxAge) {
        return cached.data;
      }
    }

    try {
      const response = await axios.get(
        `${ICONFONT_API_BASE}/project/detail.json`,
        {
          params: {
            pid: projectId,
            t: Date.now()
          },
          headers: this.getHeaders(overrideCookie),
          timeout: 30000
        }
      );

      const data = response.data;
      if (!data || !data.data || !data.data.project) {
        throw new Error("Failed to get project detail: invalid response");
      }

      const project = data.data.project;
      const result: IconfontProjectDetail = {
        id: project.id?.toString() || "",
        name: project.name || "",
        icon_count: project.icon_count || 0,
        font_family: project.font_family || "",
        created_at: project.created_at || "",
        updated_at: project.updated_at || "",
        username: data.data.creator?.username || ""
      };

      this.projectDetailCache.set(cacheKey, {
        data: result,
        timestamp: now,
        updatedAt: result.updated_at
      });

      return result;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error("Authentication failed. Please check your Iconfont cookie.");
        }
      }
      throw new Error(`Failed to get project detail: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  clearCache(): void {
    this.projectDetailCache.clear();
  }

  async searchProjectIcons(
    projectId: string,
    keyword: string,
    overrideCookie?: string,
    page: number = 1
  ): Promise<IconfontSearchResult> {
    const cookie = this.getEffectiveCookie(overrideCookie);
    if (!cookie) {
      throw new Error("Authentication required. Please provide Iconfont cookie.");
    }

    try {
      const response = await axios.get(
        `${ICONFONT_API_BASE}/project/detail.json`,
        {
          params: {
            pid: projectId,
            keyword,
            page,
            t: Date.now()
          },
          headers: {
            ...this.getHeaders(overrideCookie),
            "Referer": `https://www.iconfont.cn/manage/index?manage_type=myprojects&projectId=${projectId}&keyword=${encodeURIComponent(keyword)}&page=${page}`
          },
          timeout: 30000
        }
      );

      const data = response.data;
      if (!data || !data.data) {
        return { total: 0, page, page_size: 54, icons: [] };
      }

      const icons = (data.data.icons || []).map((icon: any) => ({
        icon_id: icon.id?.toString() || icon.icon_id?.toString() || "",
        name: icon.name || "",
        show_svg: icon.show_svg || "",
        svg: icon.svg || icon.show_svg || "",
        font_class: icon.font_class,
        unicode: icon.unicode,
        tags: icon.tags || []
      }));

      return {
        total: data.data.total || 0,
        page,
        page_size: 54,
        icons
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error("Authentication failed. Please check your Iconfont cookie.");
        }
      }
      throw new Error(`Failed to search project icons: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

export const iconfontService = new IconfontService();
