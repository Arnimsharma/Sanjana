from flask import Blueprint, request, jsonify
from models.database import get_db_connection

smart_bp = Blueprint('smart', __name__)

# Mock Data for Smart Features (Moved from frontend)
RECIPES = {
    "maggi": {
        "name": "Maggi (Basic)",
        "ingredients": ["Maggi (1 pack): ₹14", "Vegetables: ₹10", "Masala: Included"],
        "cost": 24
    },
    "paneer": {
        "name": "Paneer Butter Masala",
        "ingredients": ["Paneer (200g): ₹100", "Butter/Oil: ₹20", "Spices & Veggies: ₹40", "Cream: ₹20"],
        "cost": 180
    },
    "pasta": {
        "name": "White Sauce Pasta",
        "ingredients": ["Pasta (250g): ₹50", "Milk (500ml): ₹30", "Cheese: ₹60", "Vegetables: ₹30"],
        "cost": 170
    },
    "chai": {
        "name": "Special Masala Chai",
        "ingredients": ["Milk (250ml): ₹15", "Tea leaves: ₹5", "Ginger/Cardamom: ₹5", "Sugar: ₹2"],
        "cost": 27
    }
}

TRAVEL_COSTS = {
    "base": 5000,
    "destinations": {
        "goa": {"transport": 4000, "food": 1500, "stay": 3000},
        "manali": {"transport": 3500, "food": 1000, "stay": 2500},
        "paris": {"transport": 60000, "food": 5000, "stay": 10000},
        "mumbai": {"transport": 2000, "food": 1200, "stay": 4000}
    }
}

@smart_bp.route('/recipe/<name>', methods=['GET'])
def get_recipe(name):
    recipe = RECIPES.get(name.lower())
    if recipe:
        return jsonify(recipe), 200
    return jsonify({"error": "Recipe not found"}), 404

@smart_bp.route('/travel', methods=['POST'])
def travel_planner():
    data = request.json
    destination = data.get('destination', '').lower()
    days = int(data.get('days', 1))
    
    cost_data = TRAVEL_COSTS['destinations'].get(destination, {
        "transport": TRAVEL_COSTS['base'], 
        "food": 1000, 
        "stay": 2000
    })
    
    transport = cost_data['transport']
    food_total = cost_data['food'] * days
    stay_total = cost_data['stay'] * days
    total = transport + food_total + stay_total
    
    return jsonify({
        "destination": destination.capitalize(),
        "days": days,
        "transport": transport,
        "food": food_total,
        "stay": stay_total,
        "total": total
    }), 200

@smart_bp.route('/set_budget', methods=['POST'])
def set_budget():
    data = request.json
    user_id = data.get('user_id')
    amount = data.get('budget')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO budgets (user_id, monthly_budget)
        VALUES (?, ?)
    ''', (user_id, amount))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Budget updated"}), 200

@smart_bp.route('/budget/<int:user_id>', methods=['GET'])
def get_budget(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    budget = cursor.execute('SELECT monthly_budget FROM budgets WHERE user_id = ?', (user_id,)).fetchone()
    
    # Also get current month's expenses
    from datetime import datetime
    current_month = datetime.now().strftime('%Y-%m')
    expenses = cursor.execute('''
        SELECT SUM(amount) as total FROM expenses 
        WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    ''', (user_id, current_month)).fetchone()
    
    conn.close()
    
    monthly_budget = budget['monthly_budget'] if budget else 0
    total_expense = expenses['total'] if expenses['total'] else 0
    
    alert = ""
    if total_expense > monthly_budget and monthly_budget > 0:
        alert = "⚠️ Budget exceeded! Please control your spending"
    
    return jsonify({
        "budget": monthly_budget,
        "total_expense": total_expense,
        "remaining": max(0, monthly_budget - total_expense),
        "alert": alert
    }), 200
