/*
load dependency
"SuperBit": "file:../pxt-Superbit"
*/

//% color="#ECA40D" weight=20 icon="\u2708"
//% groups="['1 Basic motor control','2 Advance motor control']"

namespace MAKE3C {

    const PCA9685_ADD = 0x40
    const MODE1 = 0x00
    const MODE2 = 0x01
    const SUBADR1 = 0x02
    const SUBADR2 = 0x03
    const SUBADR3 = 0x04

    const LED0_ON_L = 0x06
    const LED0_ON_H = 0x07
    const LED0_OFF_L = 0x08
    const LED0_OFF_H = 0x09

    const ALL_LED_ON_L = 0xFA
    const ALL_LED_ON_H = 0xFB
    const ALL_LED_OFF_L = 0xFC
    const ALL_LED_OFF_H = 0xFD

    const PRESCALE = 0xFE

    const STP_CHA_L = 2047
    const STP_CHA_H = 4095

    const STP_CHB_L = 1
    const STP_CHB_H = 2047

    const STP_CHC_L = 1023
    const STP_CHC_H = 3071

    const STP_CHD_L = 3071
    const STP_CHD_H = 1023

    let initialized = false
    let yahStrip: neopixel.Strip;

    export enum enDuration {

        //% block="1"
        d1 = 1000,
        //% block="2"
        d2 = 2000,
        //% block="3"
        d3 = 3000,
        //% block="4"
        d4 = 4000,
        //% block="5"
        d5 = 5000,
        //% block="6"
        d6 = 6000,
    }

    export enum enDirection {

        //% block="Forward"
        di1 = 1,
        //% block="Backward"
        di2 = -1,
    }

    export enum enDuration2 {

        //% block="0.4"
        d1 = 400,
        //% block="0.5"
        d2 = 500,
        //% block="0.6"
        d3 = 600,
        //% block="0.7"
        d4 = 700
    }

    export enum enDirection2 {

        //% block="Left"
        di1 = 1,
        //% block="Right"
        di2 = -1,
    }

    export enum enMotors {
        M1 = 8,
        M2 = 10,
        M3 = 12,
        M4 = 14
    }

    export enum enPos {
        //% blockId="forward" block="forward"
        forward = 1,
        //% blockId="reverse" block="reverse"
        reverse = 2,
        //% blockId="stop" block="stop"
        stop = 3
    }

    export enum enServo {

        S1 = 0,
        S2,
        S3,
        S4,
        S5,
        S6,
        S7,
        S8
    }

    function initPCA9685(): void {
        i2cwrite(PCA9685_ADD, MODE1, 0x00)
        setFreq(50);
        initialized = true
    }

    function i2cwrite(addr: number, reg: number, value: number) {
        let buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2ccmd(addr: number, value: number) {
        let buf = pins.createBuffer(1)
        buf[0] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2cread(addr: number, reg: number) {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
        return val;
    }

    function setFreq(freq: number): void {
        // Constrain the frequency
        let prescaleval = 25000000;
        prescaleval /= 4096;
        prescaleval /= freq;
        prescaleval -= 1;
        let prescale = prescaleval; //Math.Floor(prescaleval + 0.5);
        let oldmode = i2cread(PCA9685_ADD, MODE1);
        let newmode = (oldmode & 0x7F) | 0x10; // sleep
        i2cwrite(PCA9685_ADD, MODE1, newmode); // go to sleep
        i2cwrite(PCA9685_ADD, PRESCALE, prescale); // set the prescaler
        i2cwrite(PCA9685_ADD, MODE1, oldmode);
        control.waitMicros(5000);
        i2cwrite(PCA9685_ADD, MODE1, oldmode | 0xa1);
    }

    function setPwm(channel: number, on: number, off: number): void {
        if (channel < 0 || channel > 15)
            return;
        if (!initialized) {
            initPCA9685();
        }
        let buf = pins.createBuffer(5);
        buf[0] = LED0_ON_L + 4 * channel;
        buf[1] = on & 0xff;
        buf[2] = (on >> 8) & 0xff;
        buf[3] = off & 0xff;
        buf[4] = (off >> 8) & 0xff;
        pins.i2cWriteBuffer(PCA9685_ADD, buf);
    }

    function stopMotor(index: number) {
        setPwm(index, 0, 0);
        setPwm(index + 1, 0, 0);
    }

    //% block="Single Motor %index |Speed : %speed"
    //% speed.min=-255 speed.max=255
    //% group="2 Advance motor control" weight=85
    export function MotorRun(index: enMotors, speed: number): void {
        if (!initialized) {
            initPCA9685()
        }
        speed = speed * 16; // map 255 to 4096
        if (speed >= 4096) {
            speed = 4095
        }
        if (speed <= -4096) {
            speed = -4095
        }

        let a = index
        let b = index + 1

        if (a > 10) {
            if (speed >= 0) {
                setPwm(a, 0, speed)
                setPwm(b, 0, 0)
            } else {
                setPwm(a, 0, 0)
                setPwm(b, 0, -speed)
            }
        }
        else {
            if (speed >= 0) {
                setPwm(b, 0, speed)
                setPwm(a, 0, 0)
            } else {
                setPwm(b, 0, 0)
                setPwm(a, 0, -speed)
            }
        }

    }

    //% block="Car Run | %direction|for %duration second"
    //% group="1 Basic motor control" weight=100
    export function CarRun(direction: enDirection, duration: enDuration): void {
        MotorRun(enMotors.M1, 255 * direction)
        MotorRun(enMotors.M3, 255 * direction)
        basic.pause(duration)
        MotorStopAll()
    }

    //% block="Car Turn | %direction|for %duration second"
    //% group="1 Basic motor control" weight=99
    export function CarTurn(direction: enDirection2, duration: enDuration2): void {
        MotorRun(enMotors.M1, 255 * direction * -1)
        MotorRun(enMotors.M3, 255 * direction)
        basic.pause(duration)
        MotorStopAll()
    }

    //% blockId=SuperBit_Servo3 block="Servo(180°)|Port %num|Direction %pos|Degree %value"
    //% weight=96
    //% blockGap=10
    //% num.min=1 num.max=4 value.min=0 value.max=90
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=20
    //% group="1 Basic motor control" weight=98
    export function Servo(num: enServo, pos: enPos, value: number): void {

        // 50hz: 20,000 us

        if (pos == enPos.stop) {
            let us = (86 * 1800 / 180 + 600); // 0.6 ~ 2.4
            let pwm = us * 4096 / 20000;
            setPwm(num, 0, pwm);
        }
        else if (pos == enPos.forward) { //0-90 -> 90 - 0
            let us = ((90 - value) * 1800 / 180 + 600); // 0.6 ~ 2.4
            let pwm = us * 4096 / 20000;
            setPwm(num, 0, pwm);
        }
        else if (pos == enPos.reverse) { //0-90 -> 90 -180
            let us = ((90 + value) * 1800 / 180 + 600); // 0.6 ~ 2.4
            let pwm = us * 4096 / 20000;
            setPwm(num, 0, pwm);
        }
    }

    //% block="Dual Motor M1 Speed : %speed1 | M3 Speed : %speed2 | duration %duration second"
    //% speed1.min=-255 speed1.max=255
    //% speed2.min=-255 speed2.max=255
    //% group="2 Advance motor control" weight=84
    export function MotorRunDual(speed1: number, speed2: number, duration: number): void {
        let m1 = 8
        let m2 = 12
        MotorRun(m1, speed1);
        MotorRun(m2, speed2);
        basic.pause(duration * 1000)
        MotorStopAll()
    }

    //% block
    //% group="2 Advance motor control" weight=80
    export function MotorStopAll(): void {
        if (!initialized) {
            initPCA9685()
        }

        stopMotor(enMotors.M1);
        stopMotor(enMotors.M2);
        stopMotor(enMotors.M3);
        stopMotor(enMotors.M4);

    }
    /**
     * *****************************************************************
     * @param index
     */
    //% blockId=SuperBit_RGB_Program block="Car LED Color"
    //% blockGap=10
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    //% group="1 Basic motor control" weight=91
    export function RGB_Program(): neopixel.Strip {

        if (!yahStrip) {
            yahStrip = neopixel.create(DigitalPin.P12, 4, NeoPixelMode.RGB);
        }
        return yahStrip;
    }

} 