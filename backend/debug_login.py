# -*- coding: utf-8 -*-
"""调试登录失败原因"""
import asyncio

async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=r'C:\Users\Administrator\AppData\Local\ms-playwright\chromium-1223\chrome-win64\chrome.exe')
        page = await browser.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append('PAGE: ' + str(e)))
        page.on('console', lambda m: errors.append('CONSOLE: ' + m.text) if m.type == 'error' else None)
        reqs = []
        page.on('requestfailed', lambda r: reqs.append('FAIL: ' + r.url + ' ' + str(r.failure)))
        page.on('response', lambda r: reqs.append(f'RESP {r.status}: {r.url}') if '/api/' in r.url else None)

        await page.goto('http://localhost:8000/login')
        await page.wait_for_load_state('networkidle')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'admin123')
        await page.click('.btn-login')
        await page.wait_for_timeout(3000)
        print('URL:', page.url)
        em = await page.query_selector('.error-msg')
        if em:
            print('错误提示:', await em.text_content())
        for r in reqs[:10]: print(r)
        for e in errors[:5]: print(e)
        await browser.close()

asyncio.run(main())
