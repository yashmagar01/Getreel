import pytest
import time
import asyncio
from unittest.mock import patch, AsyncMock
from link_finder import find_promised_link

# Dummy inputs
dummy_info = {"uploader": "test", "uploader_id": "123", "webpage_url": "https://instagram.com/p/123"}
dummy_transcript = "hello world"
dummy_concept = {}

@pytest.mark.asyncio
@patch('link_finder._check_creator_bio')
@patch('link_finder._check_caption')
@patch('link_finder._check_info_dict')
@patch('link_finder._check_comments')
async def test_tier1_short_circuits_before_tier3(
    mock_comments, mock_info, mock_caption, mock_bio
):
    # Setup
    mock_comments.return_value = None
    mock_info.return_value = None
    mock_caption.return_value = {"url": "https://example.com/caption", "confidence": "high"}
    
    # Run
    result = await find_promised_link(dummy_info, dummy_transcript, dummy_concept)
    
    # Assert
    assert result["winner_layer"] == "caption"
    assert result["url"] == "https://example.com/caption"
    mock_bio.assert_not_called()


@pytest.mark.asyncio
@patch('link_finder._check_youtube_crossref', new_callable=AsyncMock)
@patch('link_finder._check_targeted_search')
@patch('link_finder._check_creator_bio')
@patch('link_finder._check_transcript')
@patch('link_finder._check_caption')
@patch('link_finder._check_info_dict')
@patch('link_finder._check_comments')
async def test_tier3_runs_in_parallel(
    mock_comments, mock_info, mock_caption, mock_transcript,
    mock_bio, mock_targeted, mock_youtube
):
    # Tier 1 + 2 fail
    mock_comments.return_value = None
    mock_info.return_value = None
    mock_caption.return_value = None
    mock_transcript.return_value = None
    
    # Tier 3 return after 2s delay
    def delayed_sync_bio(*args, **kwargs):
        time.sleep(2)
        return {"url": "https://example.com/bio", "confidence": "low"}
        
    def delayed_sync_targeted(*args, **kwargs):
        time.sleep(2)
        return {"url": "https://example.com/targeted", "confidence": "high"}
        
    async def delayed_async_youtube(*args, **kwargs):
        await asyncio.sleep(2)
        return {"url": "https://example.com/youtube", "confidence": "medium"}
        
    mock_bio.side_effect = delayed_sync_bio
    mock_targeted.side_effect = delayed_sync_targeted
    mock_youtube.side_effect = delayed_async_youtube
    
    start_time = time.time()
    result = await find_promised_link(dummy_info, dummy_transcript, dummy_concept)
    end_time = time.time()
    
    elapsed = end_time - start_time
    
    # Assert runs in parallel (< 4 seconds instead of 6+)
    assert elapsed < 3.5, f"Expected running in parallel, took {elapsed:.2f}s"
    
    # The winner should be targeted_search because it has "high" confidence
    assert result is not None
    assert result["winner_layer"] == "targeted_search"
    assert result["url"] == "https://example.com/targeted"


@pytest.mark.asyncio
@patch('link_finder._check_youtube_crossref', new_callable=AsyncMock)
@patch('link_finder._check_targeted_search')
@patch('link_finder._check_creator_bio')
@patch('link_finder._check_transcript')
@patch('link_finder._check_caption')
@patch('link_finder._check_info_dict')
@patch('link_finder._check_comments')
async def test_tier3_exception_isolation(
    mock_comments, mock_info, mock_caption, mock_transcript,
    mock_bio, mock_targeted, mock_youtube
):
    # Tier 1 + 2 fail
    mock_comments.return_value = None
    mock_info.return_value = None
    mock_caption.return_value = None
    mock_transcript.return_value = None
    
    # Tier 3
    mock_bio.side_effect = RuntimeError("Bio crashed!")
    mock_targeted.return_value = {"url": "https://example.com/targeted", "confidence": "medium"}
    mock_youtube.return_value = None
    
    result = await find_promised_link(dummy_info, dummy_transcript, dummy_concept)
    
    assert result is not None
    assert result["winner_layer"] == "targeted_search"


@pytest.mark.asyncio
@patch('link_finder._check_generic_search')
@patch('link_finder._check_youtube_crossref', new_callable=AsyncMock)
@patch('link_finder._check_targeted_search')
@patch('link_finder._check_creator_bio')
@patch('link_finder._check_transcript')
@patch('link_finder._check_caption')
@patch('link_finder._check_info_dict')
@patch('link_finder._check_comments')
async def test_tier4_runs_when_all_fail(
    mock_comments, mock_info, mock_caption, mock_transcript,
    mock_bio, mock_targeted, mock_youtube, mock_generic
):
    # Tier 1 + 2 fail
    mock_comments.return_value = None
    mock_info.return_value = None
    mock_caption.return_value = None
    mock_transcript.return_value = None
    
    # Tier 3 fail
    mock_bio.return_value = None
    mock_targeted.return_value = None
    mock_youtube.return_value = None
    
    # Tier 4
    mock_generic.return_value = {"url": "https://example.com/generic", "confidence": "low"}
    
    result = await find_promised_link(dummy_info, dummy_transcript, dummy_concept)
    
    assert result is not None
    assert result["winner_layer"] == "generic_search"
    mock_generic.assert_called_once()
