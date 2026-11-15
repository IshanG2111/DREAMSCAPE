import asyncio
from winsdk.windows.media.control import GlobalSystemMediaTransportControlsSessionManager as MediaManager

async def test():
    print("Awaiting request_async()...")
    mgr = await MediaManager.request_async()
    print("Manager received:", mgr)
    sessions = mgr.get_sessions()
    print("Sessions count:", len(sessions))

asyncio.run(test())
