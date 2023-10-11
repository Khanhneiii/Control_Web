const PUB_PARSING_FAILED = "PUB_PARSING_FAILED"
const PUB_WIFI_SSID_FAILED = "PUB_WIFI_SSID_FAILED"
const PUB_WIFI_PWD_FAILED = "PUB_WIFI_PWD_FAILED"
const PUB_WIFI_SUCCESS = "PUB_WIFI_SUCCESS"
const PUB_SUCCESS = "PUB_SUCCESS"
const PUB_FAILED = "PUB_FAILED"
const PUB_WS_FAILED = "PUB_WS_FAILED"
const PUB_WS_CONNECTED = "PUB_WS_CONNECTED"
const PUB_WS_ERROR = "PUB_WS_ERROR"
const PUB_WS_CLOSE = "PUB_WS_CLOSE"
const PUB_CAMERA_FAILED = "PUB_CAMERA_FAILED"
const LED_READY = "LED_READY"
const LED_PUB = "LED_PUB"
const GET_BAT_VOL = "Get_Bat"

function showLED (key: string) {
    if (key == "LED_READY") {
        bluetooth.uartWriteString("PI_READY")
        robotbit.rgb().setPixelColor(0, neopixel.colors(NeoPixelColors.Yellow))
        robotbit.rgb().show()
    }
    if (key == "LED_PUB") {
        robotbit.rgb().setPixelColor(0, neopixel.colors(NeoPixelColors.Purple))
        robotbit.rgb().show()
    }
    if (key == "LED_OFF") {
        robotbit.rgb().setPixelColor(0, neopixel.colors(NeoPixelColors.Red))
        robotbit.rgb().show()
    }
}
bluetooth.onUartDataReceived(serial.delimiters(Delimiters.Dollar), function () {
    bleReceivedValue = bluetooth.uartReadUntil(serial.delimiters(Delimiters.Dollar))
    serial.writeLine(bleReceivedValue)
})


function pub_msg_execute(msg: string) {
    bluetooth.uartWriteString(msg)
    if (msg == PUB_WIFI_SUCCESS) {
        basic.showLeds(`
            . . # . .
            # . # . #
            # # # # #
            # . # . #
            . . # . .
            `)
    }
    else if (msg == PUB_WIFI_SSID_FAILED || msg == PUB_WIFI_PWD_FAILED || msg == PUB_PARSING_FAILED) {
        basic.showLeds(`
            . . # . .
            . . # . .
            . . # . .
            . . . . .
            . . # . .
            `)
    }
    else if (msg == PUB_WS_CONNECTED) {
        basic.showLeds(`
            . # # # .
            # . . . .
            . # # # .
            . . . . #
            . # # # .
            `)
    }
    else if (msg == PUB_WS_FAILED || msg == PUB_WS_ERROR) {
        basic.showLeds(`
            . # . # .
            . # . # .
            . # . # .
            . . . . .
            . # . # .
            `)
    }
}
// Mecanum wheel lego robot
serial.onDataReceived(serial.delimiters(Delimiters.Dollar), function () {
    direction = serial.readUntil(serial.delimiters(Delimiters.Dollar))
    executeMotion(direction, defaultValue)
    if (direction.includes("PUB_")) {
        pub_msg_execute(direction)
    }
    else executeMotion(direction, defaultValue)
})
function sendBitrate (index: number) {
    if (changeBitratePending == 0) {
        changeBitratePending = 1
        bitrateValue = bitrates[index]
        bitrateString = "{\"type\":\"bitrate\"#2"
        serial.writeLine(bitrateString)
        bitrateString = `,"value":${bitrateValue}}`
serial.writeLine(bitrateString)
        basic.showString("" + (index))
        changeBitratePending = 0
    }
}
bluetooth.onBluetoothConnected(function () {
    music.setVolume(255)
    music.ringTone(988)
    basic.pause(100)
    music.setVolume(0)
    music.stopAllSounds()
    robotbit.rgb().setPixelColor(1, neopixel.colors(NeoPixelColors.Blue))
    robotbit.rgb().show()
})
bluetooth.onBluetoothDisconnected(function () {
    music.setVolume(255)
    music.ringTone(262)
    basic.pause(100)
    music.setVolume(0)
    music.stopAllSounds()
    robotbit.rgb().setPixelColor(1, neopixel.colors(NeoPixelColors.Black))
    robotbit.rgb().show()
})
input.onButtonPressed(Button.A, function () {
    if (bitrateIndex > 0) {
        bitrateIndex += 0 - 1
        sendBitrate(bitrateIndex)
    }
})
function driveMotors (m1a: number, m1b: number, m2a: number, m2b: number) {
    robotbit.MotorRun(robotbit.Motors.M1A, m1a)
    robotbit.MotorRun(robotbit.Motors.M1B, m1b)
    robotbit.MotorRun(robotbit.Motors.M2A, m2a)
    robotbit.MotorRun(robotbit.Motors.M2B, m2b)
}
input.onButtonPressed(Button.B, function () {
    if (bitrateIndex < bitrates.length - 1) {
        bitrateIndex += 1
        sendBitrate(bitrateIndex)
    }
})
function executeMotion (key2: string, value: number) {
    if (key2 == "N") {
        driveMotors(0 - value, value, value, 0 - value)
    } else if (key2 == "S") {
        driveMotors(value, 0 - value, 0 - value, value)
    } else if (key2 == "CW") {
        driveMotors(0 - value / 4, 0 - value / 4, 0 - value / 4, 0 - value / 4)
    } else if (key2 == "CCW") {
        driveMotors(value / 4, value / 4, value / 4, value / 4)
    } else if (key2 == "FCC") {
        driveMotors(value / -3, value * 1, value * 1, value / -3)
    } else if (key2 == "FCW") {
        driveMotors(value * -1, value / 3, value / 3, value * -1)
    } else if (key2 == "BCC") {
        driveMotors(value * 1, value / -3, value / -3, value * 1)
    } else if (key2 == "BCW") {
        driveMotors(value / 3, value * -1, value * -1, value / 3)
    } else if (key2 == "FL") {
        driveMotors(value * 0, value * 1, value * 0, value * -1)
    } else if (key2 == "FR") {
        driveMotors(value * -1, value * 0, value * 1, value * 0)
    } else if (key2 == "BL") {
        driveMotors(value * 1, value * 0, value * -1, value * 0)
    } else if (key2 == "BR") {
        driveMotors(value * 0, value * -1, value * 0, value * 1)
    } else if (key2 == "L") {
        driveMotors(value, value, 0 - value, 0 - value)
    } else if (key2 == "R") {
        driveMotors(0 - value, 0 - value, value, value)
    } else if (key2 == "STOP") {
        robotbit.MotorStopAll()
    }
    if (key2 == "a01_on") {
        robotbit.GeekServo(robotbit.Servos.S1, 15)
    }
    if (key2 == "a01_off") {
        robotbit.GeekServo(robotbit.Servos.S1, 35)
    }
    showLED(key2)
}
let direction = ""
let bleReceivedValue = ""
let bitrates: number[] = []
let defaultValue = 0
let changeBitratePending = 0
let bitrateIndex = 0
let bitrateValue = 0
let bitrateString = ""
bitrateIndex = 1
bluetooth.startUartService()
changeBitratePending = 0
serial.redirect(
SerialPin.P14,
SerialPin.P15,
BaudRate.BaudRate115200
)
defaultValue = 255
robotbit.MotorStopAll()
showLED("led_off")
bitrates = [
1000000,
2000000,
3000000,
4000000,
5000000
]
basic.showString("" + (bitrateIndex))
