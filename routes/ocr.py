from flask import Blueprint, request, jsonify
import re
import os
from datetime import datetime
import cv2
import numpy as np

# OCR logic - Placeholder for EasyOCR/Tesseract
# To enable real OCR, install easyocr and uncomment the logic below
# try:
#     import easyocr
#     reader = easyocr.Reader(['en'], gpu=False)
# except ImportError:
#     reader = None

ocr_bp = Blueprint('ocr', __name__)

@ocr_bp.route('/scan_receipt', methods=['POST'])
def scan_receipt():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    try:
        # In a real scenario, we would process the image here
        # For this environment, we simulate extraction to keep the server stable
        
        # Simple simulation: extract some info from filename or just return defaults
        filename = file.filename.lower()
        
        # Mock extracted data
        extracted_data = {
            "amount": 250.00,
            "date": datetime.now().strftime('%Y-%m-%d'),
            "description": f"Extracted from {file.filename}",
            "raw_text": f"Simulated OCR result for {file.filename}. Total: 250.00 Date: {datetime.now().strftime('%d/%m/%Y')}",
            "ocr_status": "simulated"
        }
        
        # Try to find a number in filename as amount
        amount_match = re.search(r'(\d+)', filename)
        if amount_match:
            extracted_data["amount"] = float(amount_match.group(1))

        return jsonify(extracted_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def extract_amount(text):
    # Search for patterns like Total, Amount, etc. followed by a number
    # Simple regex to find the largest monetary value in the text
    amounts = re.findall(r'(\d+\.\d{2})', text)
    if amounts:
        # Convert to float and find max as a heuristic for 'Total'
        return max([float(a) for a in amounts])
    return 0.0

def extract_date(text):
    # Search for DD/MM/YYYY, YYYY-MM-DD, etc.
    date_patterns = [
        r'\d{2}/\d{2}/\d{4}',
        r'\d{4}-\d{2}-\d{2}',
        r'\d{2}-\d{2}-\d{4}',
        r'\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}'
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0)
    
    from datetime import datetime
    return datetime.now().strftime('%Y-%m-%d')
