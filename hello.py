print("Hello, Flask!")
from flask import Flask
app = Flask(__name__)
@app.route('/')
def hello(): return "Hello!"
if __name__ == '__main__':
    print("Starting server...")
    app.run(port=5001)
