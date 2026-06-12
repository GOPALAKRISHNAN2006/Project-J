import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("No API key found!")
else:
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-3.5-flash')
        response = model.generate_content("Say hello from JARVIS project!")
        print("Success! Response from Gemini:")
        print(response.text)
    except Exception as e:
        print(f"Error testing Gemini API: {e}")
