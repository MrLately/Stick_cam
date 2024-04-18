import io
from flask import Flask, render_template, request, jsonify, Response
from gpiozero import Servo
from gpiozero.pins.pigpio import PiGPIOFactory
from picamera import PiCamera

app = Flask(__name__)

# Camera setup
camera = PiCamera()
camera.rotation = 0
camera.resolution = (640, 480)  # set resolution to match the second script

# Servo setup
factory = PiGPIOFactory()
servo_pan = Servo(25, pin_factory=factory)
servo_tilt = Servo(24, pin_factory=factory)

@app.route('/')
def home():
    return render_template('index.html')

def gen():
    while True:
        stream = io.BytesIO()
        camera.capture(stream, 'jpeg')
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + stream.getvalue() + b'\r\n\r\n')
        stream.seek(0)
        stream.truncate()

@app.route('/video_feed')
def video_feed():
    return Response(gen(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/reset_servos', methods=['POST'])
def reset_servos():
    servo_pan.value = 0
    servo_tilt.value = 0
    return jsonify(status="success")

@app.route('/control_servo', methods=['POST'])
def control_servo():
    data = request.json
    pan = data.get('pan', 0)
    tilt = data.get('tilt', 0)
    pan = max(min(pan, 1), -1)
    tilt = max(min(tilt, 1), -1)
    servo_pan.value = pan
    servo_tilt.value = tilt
    return jsonify(status="success")

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=5678)
    except KeyboardInterrupt:
        pass
    finally:
        camera.close()
