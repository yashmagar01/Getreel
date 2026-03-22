import os
import asyncio
import logging
import sys
from dotenv import load_dotenv

# Add current dir to path
sys.path.append(os.path.dirname(__file__))

from dm_interceptor import init_ig_client, intercept_via_dm, get_ig_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger(__name__)

async def test_layer0():
    load_dotenv()
    
    # 1. Initialize Client
    logger.info("Step 1: Initializing Instagram client...")
    init_ig_client()
    
    client = get_ig_client()
    if not client:
        logger.error("❌ Failed to initialize Instagram client. Check your credentials in .env")
        return

    # 2. Hardcoded test reel (choose one that likely has a bot or just any reel to test flow)
    # This reel is just an example. 
    test_reel_url = "https://www.instagram.com/reel/C4X8f_6S-2_/" 
    test_shortcode = "C4X8f_6S-2_"
    test_creator = "manychat" # ManyChat's own profile often has automation examples
    
    logger.info(f"Step 2: Starting interception for @{test_creator} on {test_reel_url}")
    
    # 3. Run Interception
    # Note: This will actually post a comment if credentials are valid!
    result = await intercept_via_dm(
        reel_url=test_reel_url,
        reel_shortcode=test_shortcode,
        creator_username=test_creator
    )
    
    if result:
        logger.info(f"✅ SUCCESS: Found link via DM bot!")
        logger.info(f"URL: {result['url']}")
        logger.info(f"Source: {result['source']}")
    else:
        logger.info("❌ Layer 0 failed to find a link (this is expected if the creator has no bot or it's a test run).")
        logger.info("Check logs above to see if comment was posted and polling occurred.")

if __name__ == "__main__":
    asyncio.run(test_layer0())
