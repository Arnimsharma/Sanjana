from flask import Blueprint, request, jsonify
from models.database import get_db_connection

expense_bp = Blueprint('expense', __name__)

@expense_bp.route('/add_expense', methods=['POST'])
def add_expense():
    data = request.json
    user_id = data.get('user_id')
    date = data.get('date')
    amount = data.get('amount')
    category = data.get('category')
    description = data.get('description', '')
    
    if not all([user_id, date, amount, category]):
        return jsonify({"error": "Missing required fields"}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO expenses (user_id, date, amount, category, description)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_id, date, amount, category, description))
    expense_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Expense added", "id": expense_id}), 201

@expense_bp.route('/expenses/<int:user_id>', methods=['GET'])
def get_expenses(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    expenses = cursor.execute('SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC', (user_id,)).fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in expenses]), 200

@expense_bp.route('/update_expense/<int:id>', methods=['PUT'])
def update_expense(id):
    data = request.json
    date = data.get('date')
    amount = data.get('amount')
    category = data.get('category')
    description = data.get('description')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE expenses SET date = ?, amount = ?, category = ?, description = ?
        WHERE id = ?
    ''', (date, amount, category, description, id))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Expense updated"}), 200

@expense_bp.route('/delete_expense/<int:id>', methods=['DELETE'])
def delete_expense(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM expenses WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Expense deleted"}), 200
