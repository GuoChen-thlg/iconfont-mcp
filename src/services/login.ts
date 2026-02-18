import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";
import puppeteer, { Browser, Page } from "puppeteer";

const execAsync = promisify(exec);
const ICONFONT_URL = "https://www.iconfont.cn/";
const LOGIN_CHECK_INTERVAL = 3000;

export class IconfontLoginService {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async startLogin(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: false,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        defaultViewport: { width: 1200, height: 800 }
      });

      this.page = await this.browser.newPage();
      await this.page.goto(ICONFONT_URL, { waitUntil: "networkidle2" });
      
      console.error("Please log in to Iconfont in the opened browser...");
    } catch (error) {
      console.error("Puppeteer failed, trying to open browser with system command...");
      await this.openBrowserWithSystem();
    }
  }

  async openBrowserWithSystem(): Promise<void> {
    try {
      await execAsync(`open "${ICONFONT_URL}"`);
      console.error("Browser opened. Please log in to Iconfont in the browser.");
    } catch (error) {
      throw new Error("Failed to open browser. Please open https://www.iconfont.cn/ manually and log in.");
    }
  }

  async waitForLogin(timeout: number = 120000): Promise<string | null> {
    if (!this.page) {
      const cookie = await this.waitForCookieFromApiWithPrompt(timeout);
      return cookie;
    }

    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const cookies = await this.page.cookies();
      const sessionCookie = cookies.find(c => c.name === "EGG_SESS_ICONFONT");
      
      if (sessionCookie && sessionCookie.value) {
        console.error("Login successful! Cookie obtained.");
        await this.close();
        return sessionCookie.value;
      }

      await new Promise(resolve => setTimeout(resolve, LOGIN_CHECK_INTERVAL));
    }

    await this.close();
    throw new Error("Login timeout. Please try again.");
  }

  private async waitForCookieFromApiWithPrompt(timeout: number = 120000): Promise<string | null> {
    console.error("After logging in, please wait a few seconds...");
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const cookieResponse = await axios.get(
          "https://www.iconfont.cn/api/user/myprojects.json",
          {
            timeout: 5000,
            headers: {
              "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Referer": "https://www.iconfont.cn/"
            }
          }
        );
        
        const cookies = cookieResponse.headers["set-cookie"];
        
        if (cookies) {
          const cookieStr = Array.isArray(cookies) ? cookies.join(",") : String(cookies);
          const eggSessMatch = cookieStr.split(",").find((c: string) => c.trim().startsWith("EGG_SESS_ICONFONT="));
          
          if (eggSessMatch) {
            const cookieValue = eggSessMatch.split(";")[0].replace("EGG_SESS_ICONFONT=", "");
            console.error("Cookie obtained!");
            return cookieValue;
          }
        }
        
        console.error("Checking login status...");
      } catch (error: any) {
        console.error("Check error:", error.message);
        console.error("Check error:", error.message);
      }

      await new Promise(resolve => setTimeout(resolve, LOGIN_CHECK_INTERVAL));
    }

    throw new Error("Login timeout. Please try again.");
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  isRunning(): boolean {
    return this.browser !== null;
  }
}

export const iconfontLoginService = new IconfontLoginService();
