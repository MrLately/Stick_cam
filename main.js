$(document).ready(function () {
    // Current state for the servos
    let currentPan = 0;
    let currentTilt = 0;

    // Throttle function
    function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    // New function to reset servos when the page is loaded
    window.resetServosOnLoad = function() {
        $.ajax({
            url: '/reset_servos',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({}), // No data needs to be sent
            success: function(response) {
                console.log('Servos reset:', response);
            }
        });
    };

    var joystickContainer = document.getElementById('joystickContainer');
    var joystickSize = parseInt(getComputedStyle(joystickContainer).width);
    var rect = joystickContainer.getBoundingClientRect();
    var centerX = rect.left + (rect.width / 2);
    var centerY = rect.top + (rect.height / 2);

    var joystick = nipplejs.create({
        zone: document.getElementById('joystickContainer'),
        mode: 'static',
        position: { left: centerX + 'px', top: centerY + 'px' },
        size: joystickSize,
        color: 'blue'
    });

    function sendServoPosition() {
        $.ajax({
            url: '/control_servo',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ pan: currentPan, tilt: currentTilt }),
            success: function (response) {
                console.log(response);
            }
        });
    }

    const throttledSendServoPosition = throttle(sendServoPosition, 100);

    function updatePanTilt(data) {
        var pan = data.distance * Math.cos(data.angle.radian) / 100;
        var tilt = data.distance * Math.sin(data.angle.radian) / 100;

        currentPan = -Math.min(Math.max(pan, -1), 1);
        currentTilt = -Math.min(Math.max(tilt, -1), 1);
    }

    function smoothReturnToCenter() {
        const stepSize = 0.01;
        const interval = setInterval(() => {
            if (Math.abs(currentPan) < stepSize) {
                currentPan = 0;
            } else {
                currentPan += currentPan > 0 ? -stepSize : stepSize;
            }

            if (Math.abs(currentTilt) < stepSize) {
                currentTilt = 0;
            } else {
                currentTilt += currentTilt > 0 ? -stepSize : stepSize;
            }

            throttledSendServoPosition();

            if (currentPan === 0 && currentTilt === 0) {
                clearInterval(interval);
            }
        }, 5);
    }

    joystick.on('move', function (evt, data) {
        updatePanTilt(data);
        throttledSendServoPosition();
    }).on('end', smoothReturnToCenter);

    resetServosOnLoad();
});
