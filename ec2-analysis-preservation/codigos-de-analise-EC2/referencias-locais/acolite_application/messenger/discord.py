import discord
import logging
import threading
import asyncio

class DiscordNotifier:
    def __init__(self, token: str, channel_id: str):
        self.token = token
        self.channel_id = channel_id
        self.client = discord.Client(intents=discord.Intents.default())
        self.message_sent_event = threading.Event()
        self.bot_ready_event = asyncio.Event()
        self.bot_thread = threading.Thread(target=self.run_bot_in_background)
        self.bot_thread.daemon = True

    def run_bot_in_background(self):
        """Run bot in the background on a separate thread"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(self.client.start(self.token))

    async def on_ready(self):
        """Called when the bot is ready"""
        logging.info("Discord bot is ready.")
        self.bot_ready_event.set()

    async def send_message_async(self, message: str):
        """Send a message asynchronously and set the event when done"""
        if not self.client.is_ready():
            logging.error("Discord bot is not ready yet.")
            return

        channel = self.client.get_channel(int(self.channel_id))
        if channel:
            await channel.send(message)
            self.message_sent_event.set()  # Signal that the message was sent
        else:
            logging.error(f"Channel {self.channel_id} not found")

    def send_message(self, message: str):
        """Send a message and wait for it to be sent before continuing"""
        self.message_sent_event.clear()
        asyncio.run_coroutine_threadsafe(self.bot_ready_event.wait(), self.client.loop).result()
        asyncio.run_coroutine_threadsafe(self.send_message_async(message), self.client.loop)
        self.message_sent_event.wait()

    def start(self):
        """Start the bot in a background thread"""
        self.client.event(self.on_ready)
        self.bot_thread.start()
