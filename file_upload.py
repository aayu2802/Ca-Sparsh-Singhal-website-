import os
from datetime import datetime, timezone
from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {'pdf'}
UPLOAD_FOLDER = 'static/uploads/pdfs'

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_pdf_file(file):
    if not file or file.filename == '':
        return None, "No file selected"
    
    if not allowed_file(file.filename):
        return None, "Only PDF files are allowed"

    filename = secure_filename(file.filename)
    
    # Missing datetime import fix & modern UTC timestamp syntax
    timestamp = int(datetime.now(timezone.utc).timestamp())
    unique_filename = f"{timestamp}_{filename}"
    
    # Directory creation ensure karein
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    # Path construction with forward slashes for clean web URLs
    file_path = os.path.join(UPLOAD_FOLDER, unique_filename).replace("\\", "/")
    
    try:
        file.save(file_path)
    except Exception as e:
        return None, f"Failed to save file: {str(e)}"

    return f"/{file_path}", None