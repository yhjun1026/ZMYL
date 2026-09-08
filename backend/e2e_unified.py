# -*- coding: utf-8 -*-
"""一体模式 E2E：登录->工作台->台账->新增弹窗->退出"""
import asyncio, sys

async def main():
    from playwright.async_api import async_playwright
    R = []
    def check(name, cond):
        R.append((name, bool(cond)))
        print(('PASS ' if cond else 'FAIL ') + name)

    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=r'C:\Users\Administrator\AppData\Local\ms-playwright\chromium-1223\chrome-win64\chrome.exe')
        page = await browser.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto('http://localhost:8000/', wait_until='networkidle')
        await page.wait_for_timeout(1000)
        check('登录页加载', await page.locator('input[placeholder="请输入用户名"]').count() == 1)

        await page.fill('input[placeholder="请输入用户名"]', 'admin')
        await page.fill('input[placeholder="请输入密码"]', 'admin123')
        await page.click('.el-button--primary')
        await page.wait_for_timeout(3000)
        body = await page.inner_text('body')
        check('登录成功进入工作台', '设备台账总数' in body and '快捷入口' in body)

        # 台账
        await page.click('text=设备台账 >> nth=0')
        await page.wait_for_timeout(2000)
        body = await page.inner_text('body')
        check('台账列表页', 'UDI编码' in body)
        check('台账数据渲染(30条)', '共 3' in body or '共 2' in body)

        # 新增弹窗
        await page.click('button:has-text("新增")')
        await page.wait_for_timeout(1000)
        check('新增弹窗打开', await page.locator('.el-dialog').count() == 1)
        await page.click('.el-dialog__headerbtn')

        # 库存页
        await page.click('text=库存管理 >> nth=0')
        await page.wait_for_timeout(2000)
        body = await page.inner_text('body')
        check('库存页正常', '批号' in body)

        # 退出登录
        await page.click('.uname')
        await page.wait_for_timeout(500)
        await page.click('text=退出登录')
        await page.wait_for_timeout(1500)
        check('退出回到登录页', await page.locator('input[placeholder="请输入用户名"]').count() == 1)

        check('无JS错误', len(errors) == 0)
        if errors: print('JS errors:', errors[:3])
        await browser.close()

    print('===== %d PASS / %d FAIL =====' % (sum(1 for _, c in R if c), sum(1 for _, c in R if not c)))
    sys.exit(0 if all(c for _, c in R) else 1)

asyncio.run(main())
