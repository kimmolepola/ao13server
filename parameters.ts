export const maxRollback = 8;
export const tickInterval = 50;
export const collisionMaxDistance = 0.7;
export const collisionMaxDistanceLocalObject = 0.35;
export const maxSharedObjects = 256;
export const chatMessageTimeToLive = 60000;
// export const tickRate = 1000 / 60; // FPS
export const rotationDecay = 0.97;
export const verticalDecay = 0.99;
// netcode
export const unreliableStateInterval = 1000 / 20; // FPS
export const clientSendInterval = 1000 / 20;
export const angleMaxValue = 65535;
export const maxRemoteObjects = 256;
export const stateMaxSequenceNumber = 255;
export const recentStateSlotLength = 32;
const controlToNetworkFactor = 0.15;
export const networkToControlFactor = 1 / controlToNetworkFactor;

// fastest projectile speed 25500 km/h ~ 13769 knots
// 16 bit max value is 65535
// 65535 / 13769 = 4.76
// 65535 / 25500 = 2.57
// export const maxSpeed = 13769; // in knots
// game object max speed = 25500
export const maxSpeed = 2414; // F22 max speed
// const speedToNetworkFactor = 4.76;
export const speedToNetworkFactor = 2.57;
// on client: const networkToSpeedFactor = 1 / speedToNetworkFactor;

// 1 distance unit is 20 meters. World size is 400x400 km
export const oneDistanceUnitInMeters = 20;
export const maxWorldCoordinateValue = 10000;
export const minWorldCoordinateValue = -10000;
export const maxNetworkCoordinateValue = 4294967295; // 32 bit unsigned integer
// const minNetworkCoordinateValue = 0;
export const positionToNetworkAddition = -minWorldCoordinateValue;
export const positionToNetworkFactor =
  maxNetworkCoordinateValue /
  (-minWorldCoordinateValue + maxWorldCoordinateValue);
// const networkToPositionAddition = -positionToNetworkAddition;
// const networkToPositionFactor = 1 / positionToNetworkFactor;

// const oldPositionToNetworkFactor = 0.01;
// const oldNetworkToPositionFactor = 1 / positonToNetworkFactor;
// const oldPositionToNetworkAddition = 0xffffffff / 2;
// const oldNetworkToPositionAddition = -positionToNetworkAddition;

export const initialSpeed = 0;
export const minSpeed = 0;
const millisecondsInHour = 1000 * 60 * 60;
const metersInKm = 1000;
export const speedFactor =
  ((1 / millisecondsInHour) * metersInKm) / oneDistanceUnitInMeters;
// thrust - drag² physics: v_max ≈ sqrt(3×thrustForce / dragCoefficient) ≈ 2414 km/h at full throttle (up=3)
export const thrustForce = 79; // km/h per second per input count
export const dragCoefficient = 4.06e-5; // (km/h/s) / (km/h)²
export const brakeForce = 20; // km/h per second per input count
// S-curve: thrust ramps from thrustMinFactor at v=0 to 1.0 at thrustRampSpeed
export const thrustMinFactor = 0.1; // fraction of thrust available at standstill
export const thrustRampSpeed = 800; // km/h at which thrust reaches full power

export const maxRotationSpeedAbsolute = 32;
export const rotationFactor = 0.00002;
export const forceLeftOrRightToRotationFactor = 0.25;

export const maxVerticalSpeedAbsolute = 127;
export const verticalSpeedFactor = 0.001;
export const forceAscOrDescToVerticalSpeedFactor = 0.01;

export const bulletSpeed = 3500;
export const bulletSpeedReductionFactor = 0.999;
export const shotDelay = 100;
export const bulletTimeToLive = 2000;

export const maxHealth = 100;
export const maxFuelKg = 8200;
export const fuelToNetworkRatio = 255 / maxFuelKg;
export const maxBullets = 480;

export const ackMaxMissedWindows = 3; // 3 × 32 ticks × 50ms = 4.8s
export const inputTimeoutMs = 3600000;
export const inputTimeoutWarningMs = 3300000;
