export const savePlayerDataInterval = 100000;
export const interpolationAlpha = 0.025;
export const chatMessageTimeToLive = 60000;
export const shotDelay = 50;
export const tickRate = 1000 / 60; // FPS
// netcode
export const unreliableStateInterval = 1000 / 20; // FPS
// export const sendInterval = 2000;
export const reliableStateInterval = 5000;
export const maxExpectedReliableTransmissionDelay = 500; // ms
export const angleMaxValue = 65535;

// fastest projectile speed 25500 km/h ~ 13769 knots
// 16 bit max value is 65535
// 65535 / 13769 = 4.76
export const maxSpeed = 13769; // in knots
export const speedToNetworkFactor = 4.76;
// on client: const networkToSpeedFactor = 1 / speedToNetworkFactor;

export const initialSpeed = 0;
export const minSpeed = 0;
export const speedFactor = 0.00003;
export const forceUpToSpeedFactor = 0.04;
export const forceDownToSpeedFactor = 0.04;

export const maxRotationSpeedAbsolute = 127;
export const rotationFactor = 0.00001;
export const forceLeftOrRightToRotationFactor = 0.1;

export const maxVerticalSpeedAbsolute = 127;
export const verticalSpeedFactor = 0.001;
export const forceAscOrDescToVerticalSpeedFactor = 0.01;

export const bulletSpeed = 1000;
export const bulletSpeedReductionFactor = 0.97;
