# -*- coding: utf-8 -*-
"""E2E验证原版样式还原"""
import asyncio

async def main():
    from playwright.async_api import async_playwright
    R = []
    def check(name, cond):
        R.append(bool(cond))
        print(('PASS ' if cond else 'FAIL ') + name)

    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=r'C:\Users\Administrator\AppData\Local\ms-playwright\chromium-1223\chrome-win64\chrome.exe')
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))

        await page.goto('http://localhost:8000/login')
        await page.wait_for_load_state('networkidle')
        # 登录页原版样式
        box = await page.query_selector('.login-box')
        check('登录页 login-box 卡片', box)
        if box:
            bg = await box.evaluate('el => getComputedStyle(el).borderRadius')
            check('卡片圆角16px(原版)', bg == '16px')
        dots = await page.query_selector_all('.background-particles .dot')
        check('粒子背景6个', len(dots) == 6)
        btn = await page.query_selector('.btn-login')
        check('渐变登录按钮', btn)

        # 登录
        await page.fill('#username', 'admin')
        await page.fill('#password', 'admin123')
        await btn.click()
        await page.wait_for_url('**/dashboard', timeout=8000)
        await page.wait_for_load_state('networkidle')
        check('登录进入工作台', '/dashboard' in page.url)

        # 工作台原版样式
        await page.wait_for_timeout(500)
        check('tech-hero横幅', await page.query_selector('.tech-hero'))
        check('tech时钟', await page.query_selector('.tech-clock'))
        cards = await page.query_selector_all('.tech-stat-card')
        check(f'统计卡片12张(实际{len(cards)})', len(cards) == 12)
        check('系统运行正常状态灯', await page.query_selector('.tech-status-pill'))

        # 侧边栏原版样式
        sb = await page.query_selector('.sidebar')
        check('深色侧边栏', sb)
        if sb:
            bg = await sb.evaluate('el => getComputedStyle(el).backgroundColor')
            check(f'侧边栏#1a2332(实际{bg})', 'rgb(26, 35, 50)' in bg)
        seps = await page.query_selector_all('.nav-separator')
        check(f'分组分隔符7个(实际{len(seps)})', len(seps) == 7)
        items = await page.query_selector_all('.nav-item')
        check(f'菜单29项(实际{len(items)})', len(items) == 29)
        gsp = await page.query_selector('.nav-gsp')
        check('GSP条目角标', gsp)

        # 台账模块
        await items[12].click() if len(items) > 12 else None
        await page.wait_for_url('**/module/**', timeout=8000)
        await page.wait_for_load_state('networkidle')
        await page.wait_for_timeout(800)
        check('模块表格card', await page.query_selector('.card'))
        tds = await page.query_selector_all('tbody tr')
        check(f'台账数据行(实际{len(tds)})', len(tds) > 0)
        check('新增按钮', await page.query_selector('.card-header .btn-primary'))

        # 折叠（JS click，避免动画稳定性问题）
        await page.evaluate("document.querySelector('.toggle-btn').click()")
        await page.wait_for_timeout(400)
        collapsed = await page.evaluate("document.querySelector('.sidebar').classList.contains('collapsed')")
        check('侧边栏可折叠', collapsed)
        await page.evaluate("document.querySelector('.toggle-btn').click()")

        check(f'无JS错误({len(errors)}个)', len(errors) == 0)
        if errors: print('  错误:', errors[:3])
        await browser.close()

    print(f"===== {R.count(True)} PASS / {R.count(False)} FAIL =====")

asyncio.run(main())
