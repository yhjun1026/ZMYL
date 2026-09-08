# -*- coding: utf-8 -*-
"""截图：登录页/工作台/模块页"""
import asyncio

async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=r'C:\Users\Administrator\AppData\Local\ms-playwright\chromium-1223\chrome-win64\chrome.exe')
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        await page.goto('http://localhost:8000/login')
        await page.wait_for_load_state('networkidle')
        await page.screenshot(path=r'D:\爱马士专用\工作\卓盟医疗\med-stack\shot_login.png')
        await page.fill('#username', 'admin')
        await page.fill('#password', 'admin123')
        await page.click('.btn-login')
        await page.wait_for_url('**/dashboard', timeout=8000)
        await page.wait_for_timeout(1500)
        await page.screenshot(path=r'D:\爱马士专用\工作\卓盟医疗\med-stack\shot_dashboard.png')
        await page.evaluate("document.querySelectorAll('.nav-item')[12].click()")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=r'D:\爱马士专用\工作\卓盟医疗\med-stack\shot_module.png')
        await browser.close()
        print('done')

asyncio.run(main())
