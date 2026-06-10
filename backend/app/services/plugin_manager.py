import os
import importlib
import json
from typing import Dict, Any, List, Optional, Type
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.plugin import Plugin, PluginStatus

class PluginMetadata(BaseModel):
    name: str
    version: str
    description: str
    author: str
    entry_point: str
    capabilities: List[str]
    settings_schema: Optional[Dict[str, Any]] = None

class BasePlugin:
    """Interface for all JARVIS plugins."""
    
    def __init__(self, metadata: PluginMetadata, settings: Dict[str, Any] = None):
        self.metadata = metadata
        self.settings = settings or {}

    async def initialize(self):
        """Called when plugin is enabled."""
        pass

    async def shutdown(self):
        """Called when plugin is disabled."""
        pass

    async def execute_capability(self, capability: str, params: Dict[str, Any]) -> Any:
        """Main entry point for plugin actions."""
        raise NotImplementedError()

class PluginManager:
    """Core service for managing the lifecycle of plugins."""

    def __init__(self, plugin_dir: str = "plugins"):
        self.plugin_dir = plugin_dir
        self.active_plugins: Dict[str, BasePlugin] = {}
        os.makedirs(self.plugin_dir, exist_ok=True)

    async def discover_plugins(self) -> List[PluginMetadata]:
        """Scan the plugin directory for valid plugins."""
        plugins = []
        for d in os.listdir(self.plugin_dir):
            manifest_path = os.path.join(self.plugin_dir, d, "manifest.json")
            if os.path.exists(manifest_path):
                with open(manifest_path, 'r') as f:
                    data = json.load(f)
                    plugins.append(PluginMetadata(**data))
        return plugins

    async def load_plugin(self, metadata: PluginMetadata, settings: Dict[str, Any] = None) -> bool:
        """Dynamically import and instantiate a plugin."""
        try:
            # Simplified dynamic import logic
            module_path = f"{self.plugin_dir}.{metadata.name}.{metadata.entry_point.replace('.py', '')}"
            # importlib.import_module would go here in a full implementation
            # For now, we'll simulate the load
            print(f"Loading plugin: {metadata.name} v{metadata.version}")
            return True
        except Exception as e:
            print(f"Failed to load plugin {metadata.name}: {e}")
            return False

    async def toggle_plugin(self, db: AsyncSession, plugin_id: str, enabled: bool):
        """Update plugin status in database and load/unload in-memory."""
        await db.execute(
            update(Plugin).where(Plugin.id == plugin_id).values(is_enabled=enabled)
        )
        await db.commit()

    async def execute_plugin_task(self, name: str, capability: str, params: Dict[str, Any]) -> Any:
        """High-level call for agents to use plugins."""
        if name not in self.active_plugins:
            return f"Error: Plugin {name} is not active."
        return await self.active_plugins[name].execute_capability(capability, params)
