import os
os.environ.setdefault('DISPLAY', ':0')
import subprocess
import json
import shutil
import cv2
from pathlib import Path
from typing import Dict, Any, List, Callable
try:
    import pyautogui
    import pyperclip
except Exception:
    class MockPyAutoGUI:
        def __getattr__(self, name):
            return lambda *args, **kwargs: "Not available in headless mode"
    pyautogui = MockPyAutoGUI()
    pyperclip = MockPyAutoGUI()
from app.services.memory_service import MemoryService
from app.core.database import get_chroma_client
from app.services.vision_service import VisionService
from app.services.agents.playwright_service import PlaywrightService
from app.services.google_service import GmailService, GoogleCalendarService
from app.services.task_service import TaskService
from app.services.home_assistant_service import HomeAssistantService

class ToolRegistry:
    """Registry of tools available to Nexus-6 agents."""
    
    def __init__(self, user):
        self.user = user
        self.pw_service = PlaywrightService(user)
        self.vision_service = VisionService()
        self.gmail = GmailService(str(user.id))
        self.calendar = GoogleCalendarService(str(user.id))
        self.hass = HomeAssistantService()
        
        self.tools: Dict[str, Callable] = {
            # Core Tools
            "web_search": self.web_search,
            "read_pdf": self.read_pdf,
            "execute_python": self.execute_python,
            "search_memory": self.search_memory,
            
            # Home Assistant (IoT)
            "hass_list_devices": self.hass_list_devices,
            "hass_control_device": self.hass_control_device,
            "hass_get_status": self.hass_get_status,
            
            # Google Workspace
            "gmail_list": self.gmail_list,
            "gmail_send": self.gmail_send,
            "calendar_list": self.calendar_list,
            "calendar_create": self.calendar_create,
            
            # AI Task Manager
            "task_create": self.task_create,
            "task_list": self.task_list,
            "task_update": self.task_update,
            
            # Computer Automation
            "open_app": self.open_app,
            "close_app": self.close_app,
            "mouse_control": self.mouse_control,
            "keyboard_control": self.keyboard_control,
            "take_screenshot": self.take_screenshot,
            "clipboard_access": self.clipboard_access,
            "run_command": self.run_command,
            
            # AI File Manager
            "file_search": self.file_search,
            "file_operation": self.file_operation,
            "summarize_document": self.summarize_document,

            # Playwright Browser Automation
            "google_search": self.google_search,
            "fill_web_form": self.fill_web_form,
            "read_website": self.read_website,
            "summarize_page": self.summarize_page,
            "download_web_file": self.download_web_file,
            "auto_login": self.auto_login,

            # Antigravity IDE & Git Integration
            "antigravity_open": self.antigravity_open,
            "git_operation": self.git_operation,
            "antigravity_explain_code": self.antigravity_explain_code,
            "antigravity_generate_code": self.antigravity_generate_code,
            "antigravity_debug": self.antigravity_debug,

            # Vision & OCR Tools
            "webcam_capture": self.webcam_capture,
            "detect_faces_objects": self.detect_faces_objects,
            "recognize_gestures": self.recognize_gestures,
            "ocr_document": self.ocr_document,
            "read_business_card": self.read_business_card,
            "read_receipt": self.read_receipt,
            
            # Multimodal Visual Analysis
            "analyze_screenshot": self.analyze_screenshot,
            "analyze_image": self.analyze_image,
            "visual_qa": self.visual_qa
        }

    async def call_tool(self, name: str, **kwargs) -> Any:
        if name not in self.tools:
            return f"Error: Tool '{name}' not found."
        try:
            return await self.tools[name](**kwargs)
        except Exception as e:
            return f"Error executing tool '{name}': {str(e)}"

    # ── Google Workspace Implementation ──────────────────────────────────────

    async def gmail_list(self, query: str = "is:unread") -> List[Dict[str, Any]]:
        return await self.gmail.list_emails(query)

    async def gmail_send(self, to: str, subject: str, body: str) -> Dict[str, str]:
        return await self.gmail.send_email(to, subject, body)

    async def calendar_list(self) -> List[Dict[str, Any]]:
        return await self.calendar.list_events()

    async def calendar_create(self, summary: str, start: str, end: str, desc: str = "") -> Dict[str, Any]:
        return await self.calendar.create_event(summary, desc, start, end)

    # ── AI Task Manager Implementation ───────────────────────────────────────

    async def _get_task_service(self):
        from app.core.database import async_session
        async with async_session() as session:
            return TaskService(session)

    async def task_create(self, title: str, desc: str = "", priority: int = 0, due: str = None) -> str:
        svc = await self._get_task_service()
        from app.models.task import TaskCreate
        from datetime import datetime
        dt = datetime.fromisoformat(due) if due else None
        task = await svc.create_task(str(self.user.id), TaskCreate(title=title, description=desc, priority=priority, due_date=dt))
        return f"Task created: {task.id}"

    async def task_list(self, status: str = None) -> List[str]:
        svc = await self._get_task_service()
        tasks = await svc.list_tasks(str(self.user.id), status)
        return [str(t.id) for t in tasks]

    async def task_update(self, task_id: str, status: str) -> str:
        svc = await self._get_task_service()
        from app.models.task import TaskUpdate
        await svc.update_task(str(self.user.id), task_id, TaskUpdate(status=status))
        return f"Task {task_id} updated to {status}"

    # ── Playwright Implementation ─────────────────────────────────────────────

    async def google_search(self, query: str) -> List[Dict[str, str]]:
        return await self.pw_service.search_google(query)

    async def fill_web_form(self, url: str, fields: Dict[str, str], submit_selector: str = None) -> str:
        return await self.pw_service.fill_form(url, fields, submit_selector)

    async def read_website(self, url: str) -> str:
        return await self.pw_service.read_website(url)

    async def summarize_page(self, url: str) -> str:
        content = await self.pw_service.read_website(url)
        from app.services.ai_service import AIService
        ai = AIService.from_user(self.user)
        return await ai.summarize(content)

    async def download_web_file(self, url: str, save_path: str) -> str:
        return await self.pw_service.download_file(url, save_path)

    async def auto_login(self, url: str, username_selector: str, password_selector: str, username: str, password: str, submit_selector: str) -> str:
        return await self.pw_service.login(url, username_selector, password_selector, username, password, submit_selector)

    # ── Antigravity IDE & Git Integration ─────────────────────────────────────

    async def antigravity_open(self, path: str = ".") -> str:
        try:
            subprocess.run(["agy"], shell=True, cwd=path, check=True)
            return f"Antigravity IDE (agy) initialized at: {path}"
        except Exception as e:
            return f"Failed to initialize Antigravity: {str(e)}"

    async def git_operation(self, command: str, repo_path: str = ".") -> str:
        try:
            full_cmd = f"git {command}" if not command.startswith("git") else command
            result = subprocess.run(full_cmd, shell=True, cwd=repo_path, capture_output=True, text=True)
            return result.stdout if result.returncode == 0 else result.stderr
        except Exception as e:
            return f"Git operation failed: {str(e)}"

    async def antigravity_explain_code(self, file_path: str, line_range: str = None) -> str:
        try:
            content = Path(file_path).read_text()
            from app.services.ai_service import AIService
            ai = AIService.from_user(self.user)
            prompt = f"Using Antigravity context, explain this code:\n\n```\n{content}\n```"
            if line_range: prompt += f"\nFocus on lines: {line_range}"
            return await ai.complete([{"role": "user", "content": prompt}])
        except Exception as e:
            return f"Failed to explain code in Antigravity: {str(e)}"

    async def antigravity_generate_code(self, task: str, file_path: str, context: str = "") -> str:
        try:
            from app.services.ai_service import AIService
            ai = AIService.from_user(self.user)
            prompt = f"Collaborating via Antigravity, write code for: {task}\nContext: {context}\nOutput ONLY the raw code."
            code = await ai.complete([{"role": "user", "content": prompt}])
            Path(file_path).write_text(code)
            return f"Code generated via Antigravity and written to {file_path}"
        except Exception as e:
            return f"Failed to generate code via Antigravity: {str(e)}"

    async def antigravity_debug(self, command: str, file_path: str = None) -> str:
        try:
            result = subprocess.run(command, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                return f"Antigravity debug successful:\n{result.stdout}"
            from app.services.ai_service import AIService
            ai = AIService.from_user(self.user)
            prompt = f"Analyze this Antigravity error and suggest a fix:\n\nCommand: {command}\nError:\n{result.stderr}"
            analysis = await ai.complete([{"role": "user", "content": prompt}])
            return f"Antigravity debug failed. Analysis:\n{analysis}"
        except Exception as e:
            return f"Antigravity debug process failed: {str(e)}"

    # ── Vision & OCR Implementation ───────────────────────────────────────────

    async def webcam_capture(self, save_path: str = "webcam_shot.png") -> str:
        frame = await self.vision_service.capture_frame()
        if frame is not None:
            cv2.imwrite(save_path, frame)
            return f"Webcam frame saved to {save_path}"
        return "Failed to capture from webcam."

    async def detect_faces_objects(self, image_path: str = None) -> Dict[str, Any]:
        if image_path:
            frame = cv2.imread(image_path)
        else:
            frame = await self.vision_service.capture_frame()
        if frame is not None:
            faces = await self.vision_service.detect_faces(frame)
            return {"faces": faces, "objects": "Analysis completed."}
        return {"error": "Image/Webcam unavailable."}

    async def recognize_gestures(self) -> str:
        frame = await self.vision_service.capture_frame()
        if frame is not None:
            gestures = await self.vision_service.detect_gestures(frame)
            return f"Gestures: {', '.join(gestures) if gestures else 'None'}"
        return "Webcam unavailable."

    async def ocr_document(self, file_path: str) -> str:
        result = await self.vision_service.process_document(file_path)
        return result.get("raw_text", "No text.")

    async def read_business_card(self, image_path: str) -> str:
        text = await self.vision_service.perform_ocr(image_path)
        from app.services.ai_service import AIService
        ai = AIService.from_user(self.user)
        return await ai.complete([{"role": "user", "content": f"Extract contact info from: {text}"}])

    async def read_receipt(self, image_path: str) -> str:
        text = await self.vision_service.perform_ocr(image_path)
        from app.services.ai_service import AIService
        ai = AIService.from_user(self.user)
        return await ai.complete([{"role": "user", "content": f"Extract receipt items/total from: {text}"}])

    # ── Multimodal Visual Analysis ───────────────────────────────────────────

    def _get_image_b64(self, image_path: str) -> str:
        import base64
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    async def analyze_screenshot(self, query: str = "Analyze this screenshot.") -> str:
        path = "current_screenshot.png"
        pyautogui.screenshot(path)
        b64 = self._get_image_b64(path)
        from app.services.ai_service import AIService
        ai = AIService.from_user(self.user)
        return await ai.complete([{"role": "user", "content": query}], model="gpt-4o", image_b64=b64)

    async def analyze_image(self, image_path: str, task: str = "describe") -> str:
        b64 = self._get_image_b64(image_path)
        from app.services.ai_service import AIService
        ai = AIService.from_user(self.user)
        return await ai.complete([{"role": "user", "content": task}], model="gpt-4o", image_b64=b64)

    async def visual_qa(self, image_path: str, question: str) -> str:
        b64 = self._get_image_b64(image_path)
        from app.services.ai_service import AIService
        ai = AIService.from_user(self.user)
        return await ai.complete([{"role": "user", "content": question}], model="gpt-4o", image_b64=b64)

    # ── Home Assistant (IoT) Implementation ──────────────────────────────────

    async def hass_list_devices(self, domain: str = None) -> List[Dict[str, Any]]:
        states = await self.hass.get_states()
        if domain:
            states = [s for s in states if s["entity_id"].startswith(f"{domain}.")]
        return [{"entity_id": s["entity_id"], "name": s.get("attributes", {}).get("friendly_name"), "state": s["state"]} for s in states]

    async def hass_control_device(self, entity_id: str, action: str, params: Dict[str, Any] = None) -> str:
        params = params or {}
        if action == "turn_on":
            await self.hass.turn_on(entity_id, **params)
        elif action == "turn_off":
            await self.hass.turn_off(entity_id, **params)
        else:
            domain = entity_id.split(".")[0]
            await self.hass.call_service(domain, action, {"entity_id": entity_id, **params})
        return f"Successfully executed '{action}' on {entity_id}."

    async def hass_get_status(self, entity_id: str) -> Dict[str, Any]:
        state = await self.hass.get_state(entity_id)
        return {"entity_id": state["entity_id"], "state": state["state"], "attributes": state.get("attributes")}

    # ── Core Implementation ──────────────────────────────────────────────────
    
    async def web_search(self, query: str) -> str:
        return f"Results for '{query}': [1] Nexus-6 [2] AI Patterns..."

    async def read_pdf(self, file_path: str) -> str:
        return f"Content of {file_path}: Simulated PDF content."

    async def execute_python(self, code: str) -> str:
        try:
            import tempfile
            with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w") as f:
                f.write(code)
                f_path = f.name
            result = subprocess.run(["python", f_path], capture_output=True, text=True, timeout=10)
            os.unlink(f_path)
            return result.stdout if result.returncode == 0 else f"Error: {result.stderr}"
        except Exception as e:
            return f"Execution error: {str(e)}"

    async def search_memory(self, query: str, category: str = None) -> List[Dict[str, Any]]:
        from app.models.memory import MemoryCategory
        ms = MemoryService(get_chroma_client())
        cat = MemoryCategory(category) if category else None
        memories = await ms.search_memories(str(self.user.id), query, category=cat)
        return [m.model_dump() for m in memories]

    # ── Computer Automation ──────────────────────────────────────────────────

    async def open_app(self, app_name: str) -> str:
        os.startfile(app_name)
        return f"Opening {app_name}..."

    async def close_app(self, app_name: str) -> str:
        subprocess.run(["taskkill", "/f", "/im", f"{app_name}.exe"], capture_output=True)
        return f"Closed {app_name}."

    async def mouse_control(self, action: str, x: int = None, y: int = None, button: str = 'left') -> str:
        if action == "move": pyautogui.moveTo(x, y)
        elif action == "click": pyautogui.click(x, y, button=button)
        return f"Mouse {action} at ({x}, {y})."

    async def keyboard_control(self, action: str, text: str = "") -> str:
        if action == "type": pyautogui.write(text)
        elif action == "press": pyautogui.press(text)
        return f"Keyboard {action} '{text}'."

    async def take_screenshot(self, save_path: str = "screenshot.png") -> str:
        pyautogui.screenshot(save_path)
        return f"Saved to {save_path}."

    async def clipboard_access(self, action: str, text: str = None) -> str:
        if action == "set": pyperclip.copy(text); return "Copied."
        return f"Clipboard: {pyperclip.paste()}"

    async def run_command(self, command: str) -> str:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        return result.stdout if result.returncode == 0 else result.stderr

    # ── AI File Manager ──────────────────────────────────────────────────────

    async def file_search(self, query: str, root_dir: str = ".") -> List[str]:
        matches = []
        for root, _, files in os.walk(root_dir):
            for f in files:
                if query.lower() in f.lower(): matches.append(os.path.join(root, f))
        return matches[:20]

    async def file_operation(self, action: str, path: str, target: str = None) -> str:
        p = Path(path)
        if action == "read": return p.read_text() if p.is_file() else "Not a file."
        elif action == "rename" or action == "move": shutil.move(path, target)
        elif action == "delete":
            if p.is_file(): os.remove(path)
            else: shutil.rmtree(path)
        elif action == "create_folder": os.makedirs(path, exist_ok=True)
        return f"Op '{action}' on {path} done."

    async def summarize_document(self, file_path: str) -> str:
        content = Path(file_path).read_text()
        from app.services.ai_service import AIService
        ai = AIService.from_user(self.user)
        return await ai.summarize(content)

    def get_tool_definitions(self) -> List[Dict[str, Any]]:
        return [
            {"name": "gmail_list", "description": "List emails", "parameters": {"query": "string"}},
            {"name": "gmail_send", "description": "Send email", "parameters": {"to": "string", "subject": "string", "body": "string"}},
            {"name": "calendar_list", "description": "List events", "parameters": {}},
            {"name": "calendar_create", "description": "Create event", "parameters": {"summary": "string", "start": "string", "end": "string"}},
            {"name": "task_create", "description": "Create task", "parameters": {"title": "string", "desc": "string"}},
            {"name": "task_list", "description": "List tasks", "parameters": {"status": "string"}},
            {"name": "google_search", "description": "Google search", "parameters": {"query": "string"}},
            {"name": "read_website", "description": "Read web", "parameters": {"url": "string"}},
            {"name": "antigravity_open", "description": "Open IDE", "parameters": {"path": "string"}},
            {"name": "git_operation", "description": "Git cmd", "parameters": {"command": "string"}},
            {"name": "webcam_capture", "description": "Webcam shot", "parameters": {"save_path": "string"}},
            {"name": "ocr_document", "description": "OCR doc", "parameters": {"file_path": "string"}},
            {"name": "file_search", "description": "Find files", "parameters": {"query": "string"}},
            {"name": "file_operation", "description": "File op", "parameters": {"action": "string", "path": "string"}},
            {"name": "execute_python", "description": "Run Python", "parameters": {"code": "string"}},
            {"name": "open_app", "description": "Open app", "parameters": {"app_name": "string"}},
            {"name": "run_command", "description": "Run command", "parameters": {"command": "string"}},
            {"name": "analyze_screenshot", "description": "Analyze screen", "parameters": {"query": "string"}},
            {"name": "hass_list_devices", "description": "List Home Assistant devices", "parameters": {"domain": "string"}},
            {"name": "hass_control_device", "description": "Control a Home Assistant device", "parameters": {"entity_id": "string", "action": "string", "params": "object"}},
            {"name": "hass_get_status", "description": "Get status of a Home Assistant device", "parameters": {"entity_id": "string"}}
        ]
