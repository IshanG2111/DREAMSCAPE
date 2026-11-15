import sys
import os
sys.path.insert(0, os.path.abspath('.'))
import asyncio
import bridge

async def main():
    task = asyncio.create_task(bridge.main())
    await asyncio.sleep(1.0)
    print("Bridge started successfully without blocking!")
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

if __name__ == "__main__":
    asyncio.run(main())
