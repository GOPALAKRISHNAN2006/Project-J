from typing import List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.security import get_current_user

router = APIRouter()

# Built-in plugins catalog — extend by adding to this list or loading from disk
BUILTIN_PLUGINS = [
    {
        "id": "web-search",
        "name": "Web Search",
        "description": "Enable JARVIS to search the web in real-time using DuckDuckGo.",
        "version": "1.0.0",
        "author": "Gokul",
        "category": "Information",
        "icon": "🌐",
        "is_installed": True,
        "is_enabled": True,
        "config_schema": {},
    },
    {
        "id": "code-runner",
        "name": "Code Runner",
        "description": "Execute Python code snippets directly within the chat.",
        "version": "1.2.0",
        "author": "Gokul",
        "category": "Developer",
        "icon": "⚡",
        "is_installed": True,
        "is_enabled": False,
        "config_schema": {},
    },
    {
        "id": "file-manager",
        "name": "File Manager",
        "description": "Read and write local files with AI assistance.",
        "version": "0.9.0",
        "author": "Gokul",
        "category": "Productivity",
        "icon": "📁",
        "is_installed": False,
        "is_enabled": False,
        "config_schema": {},
    },
    {
        "id": "calendar",
        "name": "Calendar Integration",
        "description": "Sync with Google Calendar and manage events via natural language.",
        "version": "1.0.0",
        "author": "Community",
        "category": "Productivity",
        "icon": "📅",
        "is_installed": False,
        "is_enabled": False,
        "config_schema": {"api_key": "string"},
    },
    {
        "id": "github",
        "name": "GitHub Connector",
        "description": "Browse repos, open issues, and review PRs with JARVIS.",
        "version": "1.1.0",
        "author": "Community",
        "category": "Developer",
        "icon": "🐙",
        "is_installed": False,
        "is_enabled": False,
        "config_schema": {"token": "string"},
    },
    {
        "id": "weather",
        "name": "Weather",
        "description": "Get real-time weather and forecasts in your conversations.",
        "version": "1.0.0",
        "author": "Community",
        "category": "Information",
        "icon": "🌤️",
        "is_installed": True,
        "is_enabled": True,
        "config_schema": {"api_key": "string"},
    },
]


class PluginToggle(BaseModel):
    enabled: bool


@router.get("/")
async def list_plugins(current_user: dict = Depends(get_current_user)):
    """List all available plugins."""
    return BUILTIN_PLUGINS


@router.post("/{plugin_id}/install")
async def install_plugin(plugin_id: str, current_user: dict = Depends(get_current_user)):
    plugin = next((p for p in BUILTIN_PLUGINS if p["id"] == plugin_id), None)
    if not plugin:
        return {"error": "Plugin not found"}
    plugin["is_installed"] = True
    return {"message": f"Plugin '{plugin['name']}' installed", "plugin": plugin}


@router.post("/{plugin_id}/toggle")
async def toggle_plugin(
    plugin_id: str,
    body: PluginToggle,
    current_user: dict = Depends(get_current_user),
):
    plugin = next((p for p in BUILTIN_PLUGINS if p["id"] == plugin_id), None)
    if not plugin:
        return {"error": "Plugin not found"}
    plugin["is_enabled"] = body.enabled
    action = "enabled" if body.enabled else "disabled"
    return {"message": f"Plugin '{plugin['name']}' {action}", "plugin": plugin}


@router.delete("/{plugin_id}")
async def uninstall_plugin(plugin_id: str, current_user: dict = Depends(get_current_user)):
    plugin = next((p for p in BUILTIN_PLUGINS if p["id"] == plugin_id), None)
    if not plugin:
        return {"error": "Plugin not found"}
    plugin["is_installed"] = False
    plugin["is_enabled"] = False
    return {"message": f"Plugin '{plugin['name']}' uninstalled"}
