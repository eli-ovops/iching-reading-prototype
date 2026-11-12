from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs" / "qa-2026-08-07-charging-foundation"
BASE_URL = "http://127.0.0.1:4175/?variant=D&style=bronze"


def assert_no_horizontal_overflow(page):
    dimensions = page.evaluate(
        """() => ({
            viewport: document.documentElement.clientWidth,
            document: document.documentElement.scrollWidth,
            body: document.body.scrollWidth,
        })"""
    )
    assert dimensions["document"] <= dimensions["viewport"], dimensions
    assert dimensions["body"] <= dimensions["viewport"], dimensions


def assert_visible_targets_are_44pt(page):
    undersized = page.evaluate(
        """() => [...document.querySelectorAll('button, input, select, textarea')]
            .filter(element => {
                const rect = element.getBoundingClientRect()
                return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden'
            })
            .map(element => {
                const rect = element.getBoundingClientRect()
                return { tag: element.tagName, action: element.dataset.action || element.id || '', width: rect.width, height: rect.height }
            })
            .filter(item => item.width < 44 || item.height < 44)"""
    )
    assert not undersized, undersized


def assert_no_unmarked_dynamic_chinese(page):
    leaks = page.evaluate(
        """() => {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
            const leaks = []
            let node
            while ((node = walker.nextNode())) {
                const value = node.textContent.trim()
                const parent = node.parentElement
                if (!value || !/[\u3400-\u9fff]/.test(value) || !parent) continue
                if (parent.closest('[lang^="zh"]')) continue
                if (parent.closest('[data-action="set-language"][data-value="zh"]')) continue
                if (parent.getClientRects().length === 0) continue
                leaks.push(value)
            }
            return [...new Set(leaks)]
        }"""
    )
    assert not leaks, leaks


def run():
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    print("QA browser start", flush=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        )
        context = browser.new_context(viewport={"width": 390, "height": 844}, locale="zh-CN", reduced_motion="reduce")
        page = context.new_page()
        page.set_default_timeout(5_000)
        console_errors = []
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: console_errors.append(str(error)))

        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")
        print("QA opening loaded", flush=True)
        assert page.locator("body").get_attribute("data-style") == "bronze"
        assert page.locator("text=个人底色").count() == 0
        assert page.locator(".foundation-nav button").count() == 5
        assert_no_horizontal_overflow(page)
        assert_visible_targets_are_44pt(page)

        page.locator('[data-action="open-stage"][data-value="history"]').click()
        assert page.get_by_text("私密卦象历史").is_visible()
        assert page.get_by_text("还没有历史记录").is_visible()

        # A bridge value that is not a verified StoreKit transaction must not
        # unlock premium UI. Browser injection only regression-tests the same
        # enum contract that the native shell receives after verification.
        page.locator('[data-action="open-stage"][data-value="learning"]').click()
        assert page.get_by_text("本地测试权益").is_visible()
        assert page.locator(".hexagram-map button").count() == 0
        page.evaluate("window.__ichingSetEntitlementLevel('lifetime')")

        page.locator('[data-action="open-stage"][data-value="learning"]').click()
        page.wait_for_selector(".hexagram-map button")
        print("QA learning loaded", flush=True)
        assert page.locator(".hexagram-map button").count() == 64
        page.locator('.hexagram-map button[data-value="1"]').click()
        assert "乾" in page.locator(".learning-detail h1").inner_text()
        assert_no_horizontal_overflow(page)
        page.screenshot(path=EVIDENCE / "06-learning-map-detail.png", full_page=True)
        page.locator('[data-action="close-learning-entry"]').click()
        assert page.locator(".hexagram-map button").count() == 64

        page.locator('[data-action="set-language"][data-value="en"]').click()
        for stage in ("opening", "history", "learning", "themes", "trust"):
            page.locator(f'[data-action="open-stage"][data-value="{stage}"]').click()
            assert_no_unmarked_dynamic_chinese(page)
        assert page.get_by_text("Trust & boundaries").is_visible()
        page.locator('[data-action="set-language"][data-value="zh"]').click()

        page.locator('[data-action="open-stage"][data-value="opening"]').click()
        page.locator('[data-action="enter"]').click()
        for expected in range(1, 7):
            page.locator('[data-action="random-line"]').click()
            page.wait_for_function(
                "expected => document.querySelectorAll('.casting-line.is-filled').length === expected",
                arg=expected,
            )
        print("QA six casts completed", flush=True)
        page.locator('[data-action="finish-casting"]').click()
        page.wait_for_function("document.body.dataset.stage === 'reading'", timeout=15_000)
        page.wait_for_selector(".reading-layers", timeout=15_000)
        page.locator('[data-action="set-reading-layer"][data-value="perspectives"]').click()
        assert page.get_by_text("James Legge · 1882").is_visible()
        assert page.get_by_text("本轮不内置其转录", exact=False).is_visible()
        page.screenshot(path=EVIDENCE / "07-layered-reading-source-boundary.png", full_page=True)

        page.locator('[data-action="set-language"][data-value="en"]').click()
        assert_no_unmarked_dynamic_chinese(page)
        assert page.get_by_text("The six lines are read from bottom to top.", exact=False).is_visible()
        page.locator('[data-action="set-language"][data-value="zh"]').click()

        page.locator('[data-action="open-stage"][data-value="history"]').click()
        print("QA reading and history loaded", flush=True)
        assert page.locator(".history-card").count() == 1
        page.locator(".history-card").click()
        page.locator("#review-date").fill("2026-08-14")
        page.locator("#review-note").fill("一周后再看，不必当场得出结论。")
        page.locator("#history-tags").fill("可逆, 观察")
        page.locator('[data-action="save-review"]').click()
        assert page.locator("#review-date").input_value() == "2026-08-14"
        assert page.locator("#review-note").input_value().startswith("一周后")

        page.locator('[data-action="close-history-entry"]').click()
        page.locator('[data-action="export-history"][data-value="json"]').click()
        assert page.get_by_text("未加密明文", exact=False).is_visible()
        page.keyboard.press("Escape")
        assert page.locator(".confirmation-dialog").count() == 0
        page.wait_for_function("() => document.activeElement?.matches('[data-action=\"export-history\"][data-value=\"json\"]')")
        page.locator('[data-action="export-history"][data-value="json"]').click()
        with page.expect_download() as download_info:
            page.locator('[data-action="confirm-export"]').click()
        assert download_info.value.suggested_filename.endswith(".json")

        page.locator("#history-import").set_input_files(
            files=[
                {
                    "name": "invalid-version.json",
                    "mimeType": "application/json",
                    "buffer": b'{"schemaVersion":99,"records":[]}',
                }
            ]
        )
        assert page.get_by_text("导入失败", exact=False).is_visible()

        page.locator('[data-action="open-stage"][data-value="trust"]').click()
        print("QA import/export/revisit completed", flush=True)
        assert page.get_by_text("老阴 6 = 1/8", exact=False).is_visible()
        page.locator('[data-action="open-paywall"]').click()
        assert page.get_by_text("付费墙仅在 iOS 本地测试壳中可用").is_visible()
        assert_no_horizontal_overflow(page)
        page.screenshot(path=EVIDENCE / "08-trust-and-local-boundary.png", full_page=True)

        page.evaluate("window.__ichingSetEntitlementLevel('subscription')")
        page.locator('[data-action="open-stage"][data-value="themes"]').click()
        assert page.locator(".themes-page").is_visible()
        page.evaluate("window.__ichingSetEntitlementLevel('unverified-or-invalid')")
        page.locator('[data-action="open-stage"][data-value="learning"]').click()
        assert page.get_by_text("本地测试权益").is_visible()

        small_page = context.new_page()
        small_page.set_viewport_size({"width": 320, "height": 568})
        small_page.goto(BASE_URL)
        small_page.wait_for_load_state("networkidle")
        small_page.evaluate("window.__ichingSetEntitlementLevel('lifetime')")
        small_page.locator('[data-action="open-stage"][data-value="learning"]').click()
        small_page.wait_for_selector(".hexagram-map button")
        assert small_page.locator(".hexagram-map button").count() == 64
        small_page.locator('.hexagram-map button[data-value="64"]').click()
        small_page.locator('[data-action="close-learning-entry"]').click()
        assert small_page.locator(".hexagram-map button").count() == 64
        assert_no_horizontal_overflow(small_page)
        small_page.screenshot(path=EVIDENCE / "09-small-screen-320x568.png", full_page=True)

        fail_closed_context = browser.new_context(viewport={"width": 390, "height": 844}, locale="en-US")
        fail_closed_context.add_init_script(
            "Object.defineProperty(Crypto.prototype, 'getRandomValues', { configurable: true, value: undefined })"
        )
        fail_closed_page = fail_closed_context.new_page()
        fail_closed_page.goto(BASE_URL)
        fail_closed_page.wait_for_load_state("networkidle")
        fail_closed_page.locator('[data-action="set-language"][data-value="en"]').click()
        fail_closed_page.locator('[data-action="enter"]').click()
        fail_closed_page.locator('[data-action="random-line"]').click()
        assert fail_closed_page.get_by_text("secure random source is unavailable", exact=False).is_visible()
        assert fail_closed_page.locator(".casting-line.is-filled").count() == 0
        fail_closed_context.close()

        assert not console_errors, console_errors
        print("QA_PASS", flush=True)
        browser.close()


if __name__ == "__main__":
    run()
