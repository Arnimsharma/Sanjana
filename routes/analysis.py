from flask import Blueprint, jsonify
from models.database import get_db_connection
import pandas as pd

analysis_bp = Blueprint('analysis', __name__)

@analysis_bp.route('/analysis/<int:user_id>', methods=['GET'])
def get_analysis(user_id):
    conn = get_db_connection()
    query = 'SELECT * FROM expenses WHERE user_id = ?'
    df = pd.read_sql_query(query, conn, params=(user_id,))
    conn.close()
    
    if df.empty:
        return jsonify({
            "total_expense": 0,
            "category_breakdown": {},
            "monthly_summary": {}
        }), 200
    
    # Convert date to datetime for better analysis
    df['date'] = pd.to_datetime(df['date'])
    
    total_expense = float(df['amount'].sum())
    
    # Category-wise breakdown
    category_breakdown = df.groupby('category')['amount'].sum().to_dict()
    
    # Monthly summary (YYYY-MM)
    df['month'] = df['date'].dt.strftime('%Y-%m')
    monthly_summary = df.groupby('month')['amount'].sum().to_dict()
    
    return jsonify({
        "total_expense": total_expense,
        "category_breakdown": category_breakdown,
        "monthly_summary": monthly_summary
    }), 200
