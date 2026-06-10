import os
import pickle
import json
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from typing import List, Dict, Any, Optional

class GoogleService:
    """Base service for Google API interactions (Gmail, Calendar)."""
    
    SCOPES = [
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/calendar'
    ]

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.creds = self._load_credentials()

    def _load_credentials(self):
        token_path = f"tokens/token_{self.user_id}.pickle"
        creds = None
        if os.path.exists(token_path):
            with open(token_path, 'rb') as token:
                creds = pickle.load(token)
        
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                # In a real app, this would be a redirect flow. 
                # For this setup, we'll assume a local credentials.json exists for initialization.
                if os.path.exists('credentials.json'):
                    flow = InstalledAppFlow.from_client_secrets_file('credentials.json', self.SCOPES)
                    creds = flow.run_local_server(port=0)
                    with open(token_path, 'wb') as token:
                        pickle.dump(creds, token)
        return creds

    def get_service(self, service_name: str, version: str):
        if not self.creds:
            return None
        return build(service_name, version, credentials=self.creds)

class GmailService(GoogleService):
    """Specialized service for Gmail operations."""

    def __init__(self, user_id: str):
        super().__init__(user_id)
        self.service = self.get_service('gmail', 'v1')

    async def list_emails(self, query: str = "is:unread", limit: int = 10) -> List[Dict[str, Any]]:
        if not self.service: return []
        results = self.service.users().messages().list(userId='me', q=query, maxResults=limit).execute()
        messages = results.get('messages', [])
        
        emails = []
        for msg in messages:
            m = self.service.users().messages().get(userId='me', id=msg['id']).execute()
            payload = m.get('payload', {})
            headers = payload.get('headers', [])
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
            sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown')
            emails.append({
                "id": msg['id'],
                "subject": subject,
                "from": sender,
                "snippet": m.get('snippet')
            })
        return emails

    async def send_email(self, to: str, subject: str, body: str) -> Dict[str, str]:
        if not self.service: return {"error": "Unauthorized"}
        import base64
        from email.mime.text import MIMEText
        
        message = MIMEText(body)
        message['to'] = to
        message['subject'] = subject
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        msg = self.service.users().messages().send(userId='me', body={'raw': raw}).execute()
        return {"status": "success", "id": msg['id']}

class GoogleCalendarService(GoogleService):
    """Specialized service for Google Calendar operations."""

    def __init__(self, user_id: str):
        super().__init__(user_id)
        self.service = self.get_service('calendar', 'v3')

    async def list_events(self, max_results: int = 10) -> List[Dict[str, Any]]:
        if not self.service: return []
        from datetime import datetime
        now = datetime.utcnow().isoformat() + 'Z'
        events_result = self.service.events().list(
            calendarId='primary', timeMin=now,
            maxResults=max_results, singleEvents=True,
            orderBy='startTime'
        ).execute()
        return events_result.get('items', [])

    async def create_event(self, summary: str, description: str, start_time: str, end_time: str) -> Dict[str, Any]:
        if not self.service: return {"error": "Unauthorized"}
        event = {
            'summary': summary,
            'description': description,
            'start': {'dateTime': start_time, 'timeZone': 'UTC'},
            'end': {'dateTime': end_time, 'timeZone': 'UTC'},
        }
        event = self.service.events().insert(calendarId='primary', body=event).execute()
        return event
