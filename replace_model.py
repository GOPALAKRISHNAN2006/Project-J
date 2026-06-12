import os

def replace_in_file(filepath, old_text, new_text):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if old_text in content:
        content = content.replace(old_text, new_text)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated: {filepath}")

search_dir = "c:\\Users\\ELCOT\\Downloads\\Project-J"
old_model = "gemini-3.5-flash"
new_model = "gemini-3.5-flash"

for root, dirs, files in os.walk(search_dir):
    if "node_modules" in dirs:
        dirs.remove("node_modules")
    if ".git" in dirs:
        dirs.remove(".git")
    if "__pycache__" in dirs:
        dirs.remove("__pycache__")
    if "dist" in dirs:
        dirs.remove("dist")

    for file in files:
        if file.endswith(".py") or file.endswith(".tsx") or file.endswith(".ts") or file == ".env" or file == ".env.example":
            filepath = os.path.join(root, file)
            replace_in_file(filepath, old_model, new_model)
