import asyncio
from playwright.async_api import async_playwright
from typing import Dict, Any, List, Optional
from pathlib import Path

class PlaywrightService:
    """Advanced browser automation service using Playwright."""

    def __init__(self, user):
        self.user = user
        self.browser = None
        self.context = None

    async def _get_browser(self):
        if not self.browser:
            pw = await async_playwright().start()
            self.browser = await pw.chromium.launch(headless=True)
            self.context = await self.browser.new_context()
        return self.context

    async def search_google(self, query: str) -> List[Dict[str, str]]:
        context = await self._get_browser()
        page = await context.new_page()
        await page.goto(f"https://www.google.com/search?q={query}")
        
        results = []
        # Basic selector for Google search results
        search_results = await page.query_selector_all('div.g')
        for res in search_results[:5]:
            title_el = await res.query_selector('h3')
            link_el = await res.query_selector('a')
            if title_el and link_el:
                title = await title_el.inner_text()
                link = await link_el.get_attribute('href')
                results.append({"title": title, "link": link})
        
        await page.close()
        return results

    async def fill_form(self, url: str, fields: Dict[str, str], submit_selector: str = None) -> str:
        context = await self._get_browser()
        page = await context.new_page()
        await page.goto(url)
        
        for selector, value in fields.items():
            await page.fill(selector, value)
            
        if submit_selector:
            await page.click(submit_selector)
            await page.wait_for_load_state("networkidle")
            
        final_url = page.url
        await page.close()
        return f"Form filled. Final URL: {final_url}"

    async def read_website(self, url: str) -> str:
        context = await self._get_browser()
        page = await context.new_page()
        await page.goto(url)
        content = await page.inner_text('body')
        await page.close()
        return content

    async def download_file(self, url: str, save_path: str) -> str:
        context = await self._get_browser()
        page = await context.new_page()
        async with page.expect_download() as download_info:
            await page.goto(url)
        download = await download_info.value
        await download.save_as(save_path)
        await page.close()
        return f"File downloaded to {save_path}"

    async def login(self, url: str, username_selector: str, password_selector: str, username: str, password: str, submit_selector: str) -> str:
        context = await self._get_browser()
        page = await context.new_page()
        await page.goto(url)
        await page.fill(username_selector, username)
        await page.fill(password_selector, password)
        await page.click(submit_selector)
        await page.wait_for_load_state("networkidle")
        
        cookies = await context.cookies()
        await page.close()
        return f"Login attempted. Current URL: {page.url}. Cookies captured: {len(cookies)}"

    async def close(self):
        if self.browser:
            await self.browser.close()
