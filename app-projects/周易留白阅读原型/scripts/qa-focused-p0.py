from pathlib import Path
from urllib.parse import unquote

from playwright.sync_api import sync_playwright


BASE = 'http://127.0.0.1:4175/?variant=D&style=bronze'


def assert_layout(page):
    dimensions = page.evaluate("""() => ({ width: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth })""")
    assert dimensions['document'] <= dimensions['width'] and dimensions['body'] <= dimensions['width'], dimensions


def assert_no_nonclassic_chinese(page):
    leaks = page.evaluate("""() => { const values=[]; const walker=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let node; while ((node=walker.nextNode())) { const text=node.nodeValue.trim(); const parent=node.parentElement; const withoutHexagramSymbols=text.replace(/[\\u4dc0-\\u4dff]/g, ''); if (!withoutHexagramSymbols || !/[\\u3400-\\u9fff]/.test(withoutHexagramSymbols) || !parent || !parent.getClientRects().length) continue; if (parent.closest('[lang^="zh"], [aria-hidden="true"]')) continue; values.push(text) } return [...new Set(values)] }""")
    assert not leaks, leaks


def toss(page, expected):
    page.locator('[data-action="random-line"]').click()
    page.wait_for_function('(count) => document.querySelectorAll(".casting-line.is-filled").length === count', arg=expected)
    assert_no_nonclassic_chinese(page)


def open_source_and_return(page):
    with page.expect_response(lambda response: '/content/classics/library/' in unquote(response.url) and unquote(response.url).endswith('/十三经/01_周易.txt')) as response_info:
        page.locator('[data-action="open-zhouyi-source"]').click()
    assert response_info.value.status == 200
    page.wait_for_selector('.classic-reader pre')
    assert page.locator('.classics-error').count() == 0
    page.locator('[data-action="close-classic"]').click()
    page.locator('[data-action="leave-classics"]').click()
    assert page.locator('.complete-reading').is_visible()


def settings_about_library(page, language):
    assert page.locator('.opening [data-action="open-classics"]').count() == 0
    page.locator('[data-action="open-settings"]').click()
    about = 'About' if language == 'en' else '关于'
    library = 'Classics library' if language == 'en' else '典籍库'
    assert page.get_by_role('heading', name=about).is_visible()
    page.locator('.settings-link[data-action="open-classics"]').click()
    page.wait_for_selector('.classics-library')
    assert page.get_by_role('heading', name=library).is_visible()
    page.locator('[data-action="leave-classics"]').click()
    assert page.locator('.opening').is_visible()


def direct_english(playwright):
    browser = playwright.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    page = browser.new_context(viewport={'width': 390, 'height': 844}, locale='en-US').new_page()
    errors = []
    page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE + '&lang=en'); page.wait_for_load_state('networkidle')
    settings_about_library(page, 'en')
    page.locator('[data-action="enter"]').click()
    for expected in range(1, 7): toss(page, expected)
    page.locator('[data-action="finish-casting"]').click(); page.wait_for_selector('.complete-reading')
    assert_no_nonclassic_chinese(page)
    open_source_and_return(page)
    assert not errors, errors
    browser.close()


def switch_after_two_tosses(playwright):
    browser = playwright.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    page = browser.new_context(viewport={'width': 390, 'height': 844}, locale='zh-CN').new_page()
    page.goto(BASE); page.wait_for_load_state('networkidle')
    page.locator('[data-action="enter"]').click()
    toss(page, 1); toss(page, 2)
    page.locator('[data-action="open-settings"]').click()
    page.locator('[data-action="set-language"][data-value="en"]').click()
    assert_no_nonclassic_chinese(page)
    for expected in range(3, 7): toss(page, expected)
    page.locator('[data-action="finish-casting"]').click(); page.wait_for_selector('.complete-reading')
    assert_no_nonclassic_chinese(page)
    browser.close()


def compact_focus(playwright):
    browser = playwright.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    page = browser.new_context(viewport={'width': 320, 'height': 568}, locale='en-US').new_page()
    page.goto(BASE + '&lang=en'); page.wait_for_load_state('networkidle')
    assert page.locator('.opening [data-action="open-classics"]').count() == 0
    page.locator('[data-action="open-settings"]').click(); page.keyboard.press('Escape')
    page.wait_for_function("() => document.activeElement?.matches('[data-action=\"open-settings\"]')")
    assert_layout(page)
    browser.close()


def main():
    with sync_playwright() as playwright:
        direct_english(playwright)
        switch_after_two_tosses(playwright)
        compact_focus(playwright)
    print('focused P0 browser checks passed')


if __name__ == '__main__':
    main()
