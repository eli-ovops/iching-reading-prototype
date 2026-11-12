from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs' / 'qa-2026-08-09-navigation-reading'
BASE = 'http://127.0.0.1:4175/?variant=D&style=bronze'


def assert_layout(page):
    sizes = page.evaluate("""() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth })""")
    assert sizes['document'] <= sizes['viewport'] and sizes['body'] <= sizes['viewport'], sizes
    targets = page.evaluate("""() => [...document.querySelectorAll('button,input,select,textarea')].filter(e => { const r=e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).visibility !== 'hidden' && !e.matches('.visually-hidden') }).map(e => { const r=e.getBoundingClientRect(); return [e.dataset.action || e.id, r.width, r.height] }).filter(([,w,h]) => w < 44 || h < 44)""")
    assert not targets, targets


def assert_no_english_leak(page):
    leaks = page.evaluate("""() => { const result=[]; const walker=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let node; while ((node=walker.nextNode())) { const value=node.nodeValue.trim(); const parent=node.parentElement; if (!value || !/[\\u3400-\\u9fff]/.test(value) || !parent || !parent.getClientRects().length) continue; if (parent.closest('[lang^="zh"]') || parent.closest('[data-action="set-language"][data-value="zh"]')) continue; result.push(value) } return [...new Set(result)] }""")
    assert not leaks, leaks


def set_language(page, language):
    page.locator('[data-action="open-settings"]').click()
    page.locator(f'[data-action="set-language"][data-value="{language}"]').click()


def cast_to_reading(page):
    page.locator('[data-action="enter"]').click()
    for count in range(1, 7):
        page.locator('[data-action="random-line"]').click()
        page.wait_for_function('(count) => document.querySelectorAll(".casting-line.is-filled").length === count', arg=count)
    page.locator('[data-action="finish-casting"]').click()
    page.wait_for_selector('.complete-reading')


def run_viewport(playwright, width, height, language):
    browser = playwright.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    context = browser.new_context(viewport={'width': width, 'height': height}, locale='zh-CN', reduced_motion='reduce')
    page = context.new_page(); page.set_default_timeout(12_000)
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(BASE); page.wait_for_load_state('networkidle')
    assert page.locator('body').get_attribute('data-style') == 'bronze'
    assert page.locator('.foundation-nav button').count() == 3
    assert page.locator('[data-value="learning"], [data-value="themes"]').count() == 0
    assert_layout(page)

    page.locator('[data-action="open-settings"]').click()
    assert page.locator('.settings-sheet').is_visible()
    assert page.get_by_role('heading', name='偏好设置').is_visible()
    page.keyboard.press('Escape')
    assert page.locator('.settings-sheet').count() == 0
    page.locator('[data-action="open-settings"]').click()
    page.locator(f'[data-action="set-language"][data-value="{language}"]').click()
    assert page.locator('.settings-sheet').is_visible()
    page.locator('.settings-close').click()
    if language == 'en': assert_no_english_leak(page)
    assert_layout(page)

    cast_to_reading(page)
    assert page.locator('.complete-reading .reading-section').count() >= 5
    assert page.locator('[data-action="continue"]').count() == 0
    assert page.locator('.complete-reading').evaluate('(e) => e.scrollHeight') > height
    page.locator('#reading-prompts').scroll_into_view_if_needed()
    if language == 'en': assert_no_english_leak(page)
    assert_layout(page)
    page.screenshot(path=EVIDENCE / f'{language}-{width}x{height}-reading.png', full_page=True)

    page.locator('[data-action="open-stage"][data-value="history"]').click()
    assert page.locator('.history-search').is_visible() is False  # free history remains intentionally limited
    page.evaluate("window.__ichingSetEntitlementLevel('lifetime')")
    assert page.locator('.history-search').is_visible()
    page.locator('#history-search').fill('999')
    assert page.get_by_text('No readings match these filters' if language == 'en' else '没有符合当前筛选的记录').is_visible()
    page.locator('[data-action="clear-history-filters"]').click()
    page.locator('[data-action="set-history-period"][data-value="7d"]').click()
    page.locator('[data-action="clear-history-filters"]').click()
    assert page.locator('.history-card').count() == 1
    page.locator('.history-card').click()
    tag = '观察' if language == 'zh' else 'observe'
    page.locator('#history-tags').fill(f'{tag}, ' + ('可逆' if language == 'zh' else 'reversible'))
    page.locator('#review-note').fill('可选的事后回看，不在起卦当下强迫填写。' if language == 'zh' else 'An optional later reflection, never required at casting time.')
    page.locator('[data-action="save-review"]').click()
    page.locator('[data-action="close-history-entry"]').click()
    page.locator('#history-search').fill(tag)
    assert page.locator('.history-card').count() == 1
    page.locator('.history-card').click()
    page.locator('[data-action="request-delete-history"]').click()
    assert page.locator('[data-action="confirm-delete-history"]').is_visible()
    page.locator('[data-action="cancel-delete-history"]').click()
    page.locator('[data-action="close-history-entry"]').click()
    assert page.locator('#history-search').input_value() == tag
    page.locator('[data-action="clear-history-filters"]').click()
    assert_layout(page)
    assert not errors, errors
    browser.close()


def main():
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        run_viewport(playwright, 390, 844, 'zh')
        run_viewport(playwright, 390, 844, 'en')
        run_viewport(playwright, 320, 568, 'zh')
    print('navigation-reading browser matrix passed')


if __name__ == '__main__':
    main()
