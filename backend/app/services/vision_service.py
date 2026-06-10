import cv2
import mediapipe as mp
import pytesseract
from PIL import Image
import numpy as np
from pdf2image import convert_from_path
import io
import os
from typing import Dict, Any, List, Optional

class VisionService:
    """Advanced Computer Vision and OCR service for JARVIS."""

    def __init__(self):
        # MediaPipe initialization
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_object_detection = mp.solutions.object_detection
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        
        self.face_detection = self.mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)
        self.hands = self.mp_hands.Hands(static_image_mode=False, max_num_hands=2, min_detection_confidence=0.5)
        
        # In a real setup, object detection might need a specific model path or different library
        # Using a simple placeholder or basic OpenCV cascade for object detection if mp isn't enough

    async def capture_frame(self) -> Optional[np.ndarray]:
        """Capture a single frame from the default webcam."""
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            return None
        ret, frame = cap.read()
        cap.release()
        return frame if ret else None

    async def detect_faces(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Detect faces in a frame."""
        results = self.face_detection.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        detections = []
        if results.detections:
            for detection in results.detections:
                bbox = detection.location_data.relative_bounding_box
                detections.append({
                    "score": detection.score[0],
                    "bbox": {"x": bbox.xmin, "y": bbox.ymin, "w": bbox.width, "h": bbox.height}
                })
        return detections

    async def detect_gestures(self, frame: np.ndarray) -> List[str]:
        """Detect hand gestures."""
        results = self.hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        gestures = []
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                # Basic gesture logic: count extended fingers
                fingers = []
                # Thumb
                if hand_landmarks.landmark[4].x < hand_landmarks.landmark[3].x:
                    fingers.append(1)
                else:
                    fingers.append(0)
                # Other 4 fingers
                for tip in [8, 12, 16, 20]:
                    if hand_landmarks.landmark[tip].y < hand_landmarks.landmark[tip - 2].y:
                        fingers.append(1)
                    else:
                        fingers.append(0)
                
                total_fingers = sum(fingers)
                if total_fingers == 5: gestures.append("Open Hand")
                elif total_fingers == 0: gestures.append("Fist")
                elif total_fingers == 2 and fingers[1] and fingers[2]: gestures.append("Peace")
                else: gestures.append(f"{total_fingers} fingers up")
        return gestures

    async def perform_ocr(self, image_data: Any) -> str:
        """Perform OCR on an image (PIL Image or path)."""
        if isinstance(image_data, str):
            img = Image.open(image_data)
        elif isinstance(image_data, bytes):
            img = Image.open(io.BytesIO(image_data))
        else:
            img = image_data # Assume PIL image
            
        return pytesseract.image_to_string(img)

    async def read_pdf_ocr(self, pdf_path: str) -> str:
        """Convert PDF pages to images and perform OCR on each."""
        images = convert_from_path(pdf_path)
        full_text = []
        for i, image in enumerate(images):
            text = pytesseract.image_to_string(image)
            full_text.append(f"--- Page {i+1} ---\n{text}")
        return "\n".join(full_text)

    async def process_document(self, file_path: str, doc_type: str = "general") -> Dict[str, Any]:
        """Specialized OCR processing for different document types."""
        if file_path.lower().endswith(".pdf"):
            text = await self.read_pdf_ocr(file_path)
        else:
            text = await self.perform_ocr(file_path)

        # AI-driven extraction could be added here
        return {
            "type": doc_type,
            "raw_text": text,
            "summary": "Processed via JARVIS Vision Engine"
        }
