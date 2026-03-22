import os
import re
import asyncio
import logging
import random
import time
from datetime import datetime
from typing import Optional, List, Dict
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

# ── Cookie Parsing ────────────────────────────────────────────────────────────

def parse_cookiestxt_for_playwright(path: str) -> List[Dict]:
    """Parses Netscape cookies.txt into Playwright cookie format."""
    playwright_cookies = []
    if not os.path.exists(path):
        logger.warning(f"Layer 0: Cookies file not found at {path}")
        return []

    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("#") or not line.strip():
                continue
            parts = line.strip().split("\t")
            if len(parts) >= 7:
                domain, _, path, secure, expires, name, value = parts[:7]
                playwright_cookies.append({
                    "name": name,
                    "value": value,
                    "domain": domain if domain.startswith(".") else f".{domain}",
                    "path": path,
                    "expires": int(expires) if int(expires) > 0 else -1,
                    "httpOnly": False, # Netscape format doesn't explicitly store this easily
                    "secure": secure.lower() == "true"
                })
    return playwright_cookies

# ── Initialization ────────────────────────────────────────────────────────────

def init_ig_client():
    """Stub for main.py integration. Playwright launches on demand."""
    logger.info("Layer 0: Playwright (Stage 0) initialized and ready.")
    pass

def get_ig_client():
    """Not used in Playwright implementation but kept for compatibility."""
    return True

# ── Layer 0 Core Logic (Playwright) ──────────────────────────────────────────

async def intercept_via_dm(
    reel_url: str,
    reel_shortcode: str,
    creator_username: str,
) -> Optional[dict]:
    """
    Layer 0: Intercept creator bot links via Playwright.
    """
    cookies_file = os.getenv("INSTAGRAM_COOKIES_PATH", "cookies.txt")
    if not os.path.isabs(cookies_file):
        cookies_file = os.path.join(os.path.dirname(__file__), cookies_file)

    cookies = parse_cookiestxt_for_playwright(cookies_file)
    if not cookies:
        return None

    async with async_playwright() as p:
        # Launch browser - headless=False so user can see what's happening
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        await context.add_cookies(cookies)
        
        page = await context.new_page()
        page.set_default_timeout(60000) # 60s timeout
        
        try:
            # Step 1: Go to Reel
            logger.info(f"Layer 0 (Playwright): Navigating to reel @{creator_username}...")
            await page.goto(reel_url, wait_until="domcontentloaded")
            
            # Step 2: Post Comment
            # Look for comment box
            try:
                # Trigger phrases
                trigger_phrases = ["🙌", "link please", "send", "🔥", "interested", "link", "please send", "🙏"]
                phrase = random.choice(trigger_phrases)
                
                # Wait for comment textarea
                comment_box = await page.wait_for_selector('textarea[aria-label="Add a comment…"]', timeout=10000)
                if comment_box:
                    await comment_box.fill(phrase)
                    await page.keyboard.press("Enter")
                    logger.info(f"Layer 0: Posted comment \"{phrase}\" via browser.")
                    # Wait a bit for comment to register
                    await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"Layer 0: Could not post comment via browser: {e}")
                # We might already have a DM thread, so continue to inbox just in case
            
            # Step 3: Check Inbox
            logger.info("Layer 0: Checking Instagram Messages...")
            await page.goto("https://www.instagram.com/direct/inbox/", wait_until="domcontentloaded")
            
            found_url = None
            start_poll = time.time()
            
            # Poll for 30 seconds
            for i in range(6):
                # Look for creator thread
                # This is a bit tricky with selectors, but we can look for the username in the sidebar
                try:
                    # Look for the thread in the list
                    thread_selector = f'xpath=//span[text()="{creator_username}"]'
                    thread = await page.query_selector(thread_selector)
                    if thread:
                        await thread.click()
                        await asyncio.sleep(2)
                        
                        # Look for latest message with a link
                        # Messages are usually in specific divs
                        messages = await page.query_selector_all('div[role="none"]')
                        for msg in reversed(messages):
                            text = await msg.inner_text()
                            url_match = re.search(r'https?://[^\s<>"{}|\\^`\[\]]+', text)
                            if url_match:
                                found_url = url_match.group(0).rstrip(".,;!?)")
                                logger.info(f"Layer 0: SUCCESS! Found link in DM: {found_url}")
                                break
                    
                    if found_url:
                        break
                        
                except Exception as poll_e:
                    logger.warning(f"Layer 0: Polling error: {poll_e}")
                
                logger.info(f"Layer 0: Polling Inbox ({i+1}/6)...")
                await asyncio.sleep(5)
                await page.reload(wait_until="networkidle")

            if found_url:
                return {
                    "url": found_url,
                    "source": "dm_bot_browser",
                    "confidence": "high",
                    "label": "🤖 Auto-DM (Verified via Browser)"
                }

        except Exception as e:
            logger.error(f"Layer 0 (Playwright) Error: {e}")
        finally:
            await browser.close()
            
    return None
