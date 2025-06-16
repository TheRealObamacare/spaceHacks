// Global constants for test modules
const G_physics = 6.67430e-11;
const ROCKET_MASS_physics = 10000;
const EARTH_RADIUS_physicsJs = 6.371e6;

// Manually synced copy of default celestial bodies from physics.js
const physicsJsCelestialBodies = {
  sun: { x: 0, y: 0, mass: 1.989e30 },
  mercury: { x: 5.79e10, y: 0, mass: 3.3011e23 },
  venus: { x: 1.08e11, y: 0, mass: 4.8675e24 },
  earth: { x: 1.496e11, y: 0, mass: 5.972e24 },
  mars: { x: 2.279e11, y: 0, mass: 6.4171e23 },
  jupiter: { x: 7.786e11, y: 0, mass: 1.898e27 },
  saturn: { x: 1.432e12, y: 0, mass: 5.683e26 },
  uranus: { x: 2.867e12, y: 0, mass: 8.681e25 },
  neptune: { x: 4.515e12, y: 0, mass: 1.024e26 }
};
const EARTH_MASS_physicsJs = physicsJsCelestialBodies.earth.mass; // Convenience for orbital tests

// Helper function for comparing floating point numbers (globally available)
function globalAssertFloatClose(assert, actual, expected, maxDifference, message) {
  const L_actual = Number(actual);
  const L_expected = Number(expected);
  const L_maxDifference = Number(maxDifference);
  if (isNaN(L_actual) || isNaN(L_expected) || isNaN(L_maxDifference)) {
      assert.ok(false, `${message} - Invalid arguments (NaN): actual=${actual}, expected=${expected}, maxDifference=${maxDifference}`);
      return;
  }
  const diff = Math.abs(L_actual - L_expected);
  assert.ok(diff <= L_maxDifference, `${message} (actual: ${L_actual.toExponential(5)}, expected: ${L_expected.toExponential(5)}, diff: ${diff.toExponential(3)}, maxDiff: ${L_maxDifference.toExponential(3)})`);
}

QUnit.module('physics.core', function(hooks) {
  let originalPositionX, originalPositionY, originalRocketVelocityX, originalRocketVelocityY;
  let originalRocketThrust, originalAngle, originalRocketFuel;
  const assertFloatClose = globalAssertFloatClose; // Use global helper

  hooks.beforeEach(function(assert) {
    originalPositionX = window.positionX; originalPositionY = window.positionY;
    originalRocketVelocityX = window.rocketVelocityX; originalRocketVelocityY = window.rocketVelocityY;
    originalRocketThrust = window.rocketThrust; originalAngle = window.angle;
    originalRocketFuel = window.rocketFuel;
    window.positionX = 0; window.positionY = 0; window.rocketVelocityX = 0; window.rocketVelocityY = 0;
    window.rocketThrust = 0; window.angle = 0; window.rocketFuel = 100;
  });
  hooks.afterEach(function() {
    window.positionX = originalPositionX; window.positionY = originalPositionY;
    window.rocketVelocityX = originalRocketVelocityX; window.rocketVelocityY = originalRocketVelocityY;
    window.rocketThrust = originalRocketThrust; window.angle = originalAngle;
    window.rocketFuel = originalRocketFuel;
  });

  QUnit.test('calculateGravity', function(assert) {
    assertFloatClose(assert, calculateGravity(10, 20, 5), (G_physics * 10 * 20) / (5 * 5), 1e-15, 'Test with positive masses and distance');
    assert.strictEqual(calculateGravity(10, 20, 0), 0, 'Test with zero distance');
    assert.strictEqual(calculateGravity(0, 20, 5), 0, 'Test with zero mass for m1');
    assert.strictEqual(calculateGravity(10, 0, 5), 0, 'Test with zero mass for m2');
    assert.strictEqual(calculateGravity(0, 0, 5), 0, 'Test with zero mass for both objects');
  });
  QUnit.test('calculateDistance', function(assert) {
    assert.strictEqual(calculateDistance(0, 0, 3, 4), 5, 'Test with different coordinates (3-4-5 triangle)');
    assert.strictEqual(calculateDistance(1, 1, 1, 1), 0, 'Test with the same coordinates');
  });
  QUnit.test('calculateAcceleration', function(assert) {
    assert.strictEqual(calculateAcceleration(10, 5), 2, 'Test with positive force and mass');
    assert.strictEqual(calculateAcceleration(0, 5), 0, 'Test with zero force');
    assert.strictEqual(calculateAcceleration(10, 0), Infinity, 'Test with zero mass (should return Infinity)');
  });
  QUnit.test('calculateGravitationalForceComponents', function(assert) {
    window.positionX = 3; window.positionY = 4;
    const testRocketMass = ROCKET_MASS_physics;
    const body = { mass: 1000, x: 0, y: 0 };
    const distance = calculateDistance(window.positionX, window.positionY, body.x, body.y);
    const expectedTotalForce = calculateGravity(body.mass, testRocketMass, distance);
    const dx_calc = body.x - window.positionX; const dy_calc = body.y - window.positionY;
    const expected_fx = expectedTotalForce * (dx_calc / distance);
    const expected_fy = expectedTotalForce * (dy_calc / distance);
    let components = calculateGravitationalForceComponents(body.x, body.y, body.mass);
    assertFloatClose(assert, components.fx, expected_fx, 1e-12, 'Body at origin, rocket at (3,4) (fx)');
    assertFloatClose(assert, components.fy, expected_fy, 1e-12, 'Body at origin, rocket at (3,4) (fy)');
  });
  QUnit.test('calculateThrustComponents', function(assert) {
    const thrustToTest = 100; window.rocketThrust = thrustToTest; window.angle = 0;
    let components = calculateThrustComponents();
    assertFloatClose(assert, components.fx, thrustToTest, 1e-9, '0 deg fx');
    assertFloatClose(assert, components.fy, 0, 1e-9, '0 deg fy');
    window.angle = 45; components = calculateThrustComponents();
    assertFloatClose(assert, components.fx, thrustToTest * Math.cos(Math.PI/4), 1e-9, '45 deg fx');
    assertFloatClose(assert, components.fy, thrustToTest * Math.sin(Math.PI/4), 1e-9, '45 deg fy');
  });
  QUnit.test('calculateVelocity', function(assert) {
    assert.strictEqual(calculateVelocity(10, 2, 5), 20, 'Positive initial velocity, acceleration, and time');
    assert.strictEqual(calculateVelocity(0, 2, 5), 10, 'Zero initial velocity');
  });
  QUnit.test('calculatePosition', function(assert) {
    assert.strictEqual(calculatePosition(5, 10, 2, 3), 31, 'Positive all');
    assert.strictEqual(calculatePosition(0, 10, 2, 3), 26, 'Zero initial position');
  });
  QUnit.test('calculateAllForcesOnRocket', function(assert) {
    window.positionX = physicsJsCelestialBodies.earth.x + EARTH_RADIUS_physicsJs + 1e5;
    window.positionY = physicsJsCelestialBodies.earth.y + 1e5;
    window.rocketThrust = 50000; window.angle = 90;
    const thrustComps = calculateThrustComponents();
    const earth = physicsJsCelestialBodies.earth;
    const earth_dx = earth.x - window.positionX; const earth_dy = earth.y - window.positionY;
    const earth_dist = Math.sqrt(earth_dx*earth_dx + earth_dy*earth_dy);
    const earth_gravForceMag = calculateGravity(earth.mass, ROCKET_MASS_physics, earth_dist);
    const expected_earth_fx = earth_gravForceMag * (earth_dx / earth_dist);
    const expected_earth_fy = earth_gravForceMag * (earth_dy / earth_dist);
    const sun = physicsJsCelestialBodies.sun;
    const sun_dx = sun.x - window.positionX; const sun_dy = sun.y - window.positionY;
    const sun_dist = Math.sqrt(sun_dx*sun_dx + sun_dy*sun_dy);
    const sun_gravForceMag = calculateGravity(sun.mass, ROCKET_MASS_physics, sun_dist);
    const expected_sun_fx = sun_gravForceMag * (sun_dx / sun_dist);
    const expected_sun_fy = sun_gravForceMag * (sun_dy / sun_dist);
    const forcesResult = calculateAllForcesOnRocket();
    assert.ok(forcesResult.breakdown.earth, 'Force breakdown contains earth');
    if (forcesResult.breakdown.earth) {
      assertFloatClose(assert, forcesResult.breakdown.earth.fx, expected_earth_fx, Math.abs(expected_earth_fx * 1e-5) + 1e-3, 'Earth Fx in breakdown');
      assertFloatClose(assert, forcesResult.breakdown.earth.fy, expected_earth_fy, Math.abs(expected_earth_fy * 1e-5) + 1e-3, 'Earth Fy in breakdown');
    }
    assert.ok(forcesResult.breakdown.sun, 'Force breakdown contains sun');
    if (forcesResult.breakdown.sun) {
      assertFloatClose(assert, forcesResult.breakdown.sun.fx, expected_sun_fx, Math.abs(expected_sun_fx * 1e-5) + 1e-3, 'Sun Fx in breakdown');
      assertFloatClose(assert, forcesResult.breakdown.sun.fy, expected_sun_fy, Math.abs(expected_sun_fy * 1e-5) + 1e-3, 'Sun Fy in breakdown');
    }
    assert.ok(forcesResult.breakdown.thrust, 'Force breakdown contains thrust');
    if (forcesResult.breakdown.thrust) {
      assertFloatClose(assert, forcesResult.breakdown.thrust.fx, thrustComps.fx, 1e-9, 'Thrust Fx in breakdown');
      assertFloatClose(assert, forcesResult.breakdown.thrust.fy, thrustComps.fy, 1e-9, 'Thrust Fy in breakdown');
    }
  });
  QUnit.test('updateRocketPhysics - "no gravity", no thrust', function(assert) {
    const initialPosX = 1e20; const initialPosY = 1e20;
    const initialVelX = 10; const initialVelY = 5;
    window.positionX = initialPosX; window.positionY = initialPosY;
    window.rocketVelocityX = initialVelX; window.rocketVelocityY = initialVelY;
    window.rocketThrust = 0; const deltaTime = 1;
    let netGravAx = 0; let netGravAy = 0;
    for (const bodyName in physicsJsCelestialBodies) {
        const body = physicsJsCelestialBodies[bodyName];
        const dx = body.x - initialPosX; const dy = body.y - initialPosY;
        const distSq = dx*dx + dy*dy; const dist = Math.sqrt(distSq);
        if (dist === 0) continue;
        const forceMag = (G_physics * body.mass * ROCKET_MASS_physics) / distSq;
        netGravAx += forceMag * (dx / dist); netGravAy += forceMag * (dy / dist);
    }
    netGravAx /= ROCKET_MASS_physics; netGravAy /= ROCKET_MASS_physics;
    const expected_new_vel_x = initialVelX + netGravAx * deltaTime;
    const expected_new_vel_y = initialVelY + netGravAy * deltaTime;
    const expected_new_pos_x = initialPosX + expected_new_vel_x * deltaTime + 0.5 * netGravAx * deltaTime * deltaTime;
    const expected_new_pos_y = initialPosY + expected_new_vel_y * deltaTime + 0.5 * netGravAy * deltaTime * deltaTime;
    const result = updateRocketPhysics(deltaTime);
    assertFloatClose(assert, result.acceleration.x, netGravAx, 1e-12, 'Acceleration X near zero');
    assertFloatClose(assert, result.acceleration.y, netGravAy, 1e-12, 'Acceleration Y near zero');
    assertFloatClose(assert, result.velocity.x, expected_new_vel_x, 1e-9, 'Velocity X reflects tiny gravity');
    assertFloatClose(assert, result.velocity.y, expected_new_vel_y, 1e-9, 'Velocity Y reflects tiny gravity');
    assertFloatClose(assert, result.position.x, expected_new_pos_x, 1e-9, 'Position X reflects tiny gravity');
    assertFloatClose(assert, result.position.y, expected_new_pos_y, 1e-9, 'Position Y reflects tiny gravity');
  });
  QUnit.test('updateRocketPhysics - "only gravity" (Earth dominant), no thrust', function(assert) {
    const earth = physicsJsCelestialBodies.earth; const altitude = EARTH_RADIUS_physicsJs * 0.1;
    const initialPosX = earth.x; const initialPosY = earth.y + EARTH_RADIUS_physicsJs + altitude;
    const initialVelX = 1; const initialVelY = 0;
    window.positionX = initialPosX; window.positionY = initialPosY;
    window.rocketVelocityX = initialVelX; window.rocketVelocityY = initialVelY;
    window.rocketThrust = 0; const deltaTime = 1;
    let total_expected_ax = 0; let total_expected_ay = 0;
    for (const bodyName in physicsJsCelestialBodies) {
        const body = physicsJsCelestialBodies[bodyName];
        const dx = body.x - initialPosX; const dy = body.y - initialPosY;
        const distSq = dx*dx + dy*dy; const dist = Math.sqrt(distSq);
        if (dist === 0) continue;
        const forceMag = (G_physics * body.mass * ROCKET_MASS_physics) / distSq;
        total_expected_ax += forceMag * (dx / dist); total_expected_ay += forceMag * (dy / dist);
    }
    total_expected_ax /= ROCKET_MASS_physics; total_expected_ay /= ROCKET_MASS_physics;
    const expected_new_vel_x = initialVelX + total_expected_ax * deltaTime;
    const expected_new_vel_y = initialVelY + total_expected_ay * deltaTime;
    const expected_new_pos_x = initialPosX + expected_new_vel_x * deltaTime + 0.5 * total_expected_ax * deltaTime * deltaTime;
    const expected_new_pos_y = initialPosY + expected_new_vel_y * deltaTime + 0.5 * total_expected_ay * deltaTime * deltaTime;
    const result = updateRocketPhysics(deltaTime);
    assertFloatClose(assert, result.acceleration.x, total_expected_ax, 1e-7, 'Acceleration X (sum)');
    assertFloatClose(assert, result.acceleration.y, total_expected_ay, 1e-7, 'Acceleration Y (sum)');
    assertFloatClose(assert, result.velocity.x, expected_new_vel_x, 1e-7, 'Velocity X');
    assertFloatClose(assert, result.velocity.y, expected_new_vel_y, 1e-7, 'Velocity Y');
    assertFloatClose(assert, result.position.x, expected_new_pos_x, 1e-7, 'Position X');
    assertFloatClose(assert, result.position.y, expected_new_pos_y, 1e-7, 'Position Y');
  });
  QUnit.test('updateRocketPhysics - "only thrust" + background gravity', function(assert) {
    const initialPosX = 0; const initialPosY = 0; const initialVelX = 0; const initialVelY = 0;
    window.positionX = initialPosX; window.positionY = initialPosY;
    window.rocketVelocityX = initialVelX; window.rocketVelocityY = initialVelY;
    window.rocketThrust = 100000; window.angle = 0; const deltaTime = 1;
    let grav_ax = 0; let grav_ay = 0;
    for (const bodyName in physicsJsCelestialBodies) {
        if (bodyName === "sun" && initialPosX === physicsJsCelestialBodies.sun.x && initialPosY === physicsJsCelestialBodies.sun.y) continue;
        const body = physicsJsCelestialBodies[bodyName];
        const dx = body.x - initialPosX; const dy = body.y - initialPosY;
        const distSq = dx*dx + dy*dy; const dist = Math.sqrt(distSq);
        if (dist === 0) continue;
        const forceMag = (G_physics * body.mass * ROCKET_MASS_physics) / distSq;
        grav_ax += forceMag * (dx / dist); grav_ay += forceMag * (dy / dist);
    }
    grav_ax /= ROCKET_MASS_physics; grav_ay /= ROCKET_MASS_physics;
    const thrustComps = calculateThrustComponents();
    const thrust_ax = thrustComps.fx / ROCKET_MASS_physics; const thrust_ay = thrustComps.fy / ROCKET_MASS_physics;
    const total_expected_ax = thrust_ax + grav_ax; const total_expected_ay = thrust_ay + grav_ay;
    const expected_new_vel_x = initialVelX + total_expected_ax * deltaTime;
    const expected_new_vel_y = initialVelY + total_expected_ay * deltaTime;
    const expected_new_pos_x = initialPosX + expected_new_vel_x * deltaTime + 0.5 * total_expected_ax * deltaTime * deltaTime;
    const expected_new_pos_y = initialPosY + expected_new_vel_y * deltaTime + 0.5 * total_expected_ay * deltaTime * deltaTime;
    const result = updateRocketPhysics(deltaTime);
    assertFloatClose(assert, result.acceleration.x, total_expected_ax, 1e-7, 'Accel X (thrust + grav)');
    assertFloatClose(assert, result.acceleration.y, total_expected_ay, 1e-7, 'Accel Y (thrust + grav)');
    assertFloatClose(assert, result.velocity.x, expected_new_vel_x, 1e-7, 'Velocity X');
    assertFloatClose(assert, result.velocity.y, expected_new_vel_y, 1e-7, 'Velocity Y');
    assertFloatClose(assert, result.position.x, expected_new_pos_x, 1e-7, 'Position X');
    assertFloatClose(assert, result.position.y, expected_new_pos_y, 1e-7, 'Position Y');
  });
});

QUnit.module('physics.vectorUtils', function() {
  const assertFloatClose = globalAssertFloatClose;
  QUnit.test('calculateVectorMagnitude', function(assert) {
    assert.strictEqual(calculateVectorMagnitude(3, 4), 5, 'Positive x and y (3-4-5 triangle)');
    assert.strictEqual(calculateVectorMagnitude(-3, -4), 5, 'Negative x and y');
    assert.strictEqual(calculateVectorMagnitude(0, 0), 0, 'Zero x and y');
    assert.strictEqual(calculateVectorMagnitude(5, 0), 5, 'Y is zero');
    assert.strictEqual(calculateVectorMagnitude(0, 5), 5, 'X is zero');
  });
  QUnit.test('calculateVectorDirection', function(assert) {
    assertFloatClose(assert, calculateVectorDirection(1, 1), 45, 1e-9, '(1,1) -> 45 deg');
    assertFloatClose(assert, calculateVectorDirection(-1, 1), 135, 1e-9, '(-1,1) -> 135 deg');
    assertFloatClose(assert, calculateVectorDirection(-1, -1), -135, 1e-9, '(-1,-1) -> -135 deg');
    assertFloatClose(assert, calculateVectorDirection(1, -1), -45, 1e-9, '(1,-1) -> -45 deg');
    assertFloatClose(assert, calculateVectorDirection(0, 1), 90, 1e-9, '(0,1) -> 90 deg (North)');
    assertFloatClose(assert, calculateVectorDirection(1, 0), 0, 1e-9, '(1,0) -> 0 deg (East)');
    assertFloatClose(assert, calculateVectorDirection(0, -1), -90, 1e-9, '(0,-1) -> -90 deg (South)');
    assertFloatClose(assert, calculateVectorDirection(-1, 0), 180, 1e-9, '(-1,0) -> 180 deg (West)');
    assert.strictEqual(calculateVectorDirection(0, 0), 0, '(0,0) -> 0 deg (special case)');
  });
  QUnit.test('normalizeVector', function(assert) {
    let v = { x: 3, y: 4 }; let normalized = normalizeVector(v.x, v.y);
    assertFloatClose(assert, calculateVectorMagnitude(normalized.x, normalized.y), 1, 1e-9, 'Magnitude of normalized (3,4) is 1');
    assertFloatClose(assert, normalized.x, 3/5, 1e-9, 'Normalized (3,4) x component');
    assertFloatClose(assert, normalized.y, 4/5, 1e-9, 'Normalized (3,4) y component');
    v = { x: 0, y: 0 }; normalized = normalizeVector(v.x, v.y);
    assert.deepEqual(normalized, { x: 0, y: 0 }, 'Normalized (0,0) is (0,0)');
    v = { x: 5, y: 0 }; normalized = normalizeVector(v.x, v.y);
    assert.deepEqual(normalized, { x: 1, y: 0 }, 'Normalized (5,0) is (1,0)');
  });
  QUnit.test('dotProduct', function(assert) {
    assert.strictEqual(dotProduct(1, 0, 0, 1), 0, 'Orthogonal vectors (1,0) . (0,1)');
    assert.strictEqual(dotProduct(1, 0, 2, 0), 2, 'Parallel vectors (1,0) . (2,0)');
    assert.strictEqual(dotProduct(1, 0, -1, 0), -1, 'Anti-parallel vectors (1,0) . (-1,0)');
    assert.strictEqual(dotProduct(2, 3, 4, 5), 23, 'General case (2,3) . (4,5)');
  });
  QUnit.test('crossProductMagnitude', function(assert) {
    assert.strictEqual(crossProductMagnitude(1, 0, 0, 1), 1, '(1,0) x (0,1)');
    assert.strictEqual(crossProductMagnitude(0, 1, 1, 0), -1, '(0,1) x (1,0)');
    assert.strictEqual(crossProductMagnitude(1, 1, 2, 2), 0, 'Parallel vectors (1,1) x (2,2)');
    assert.strictEqual(crossProductMagnitude(1, 2, 3, 4), -2, 'General case (1,2) x (3,4)');
  });
  QUnit.test('rotateVector', function(assert) {
    let rotated = rotateVector(1, 0, 90);
    assertFloatClose(assert, rotated.x, 0, 1e-9, '(1,0) rotated 90 deg -> x');
    assertFloatClose(assert, rotated.y, 1, 1e-9, '(1,0) rotated 90 deg -> y');
    rotated = rotateVector(1, 0, -90);
    assertFloatClose(assert, rotated.x, 0, 1e-9, '(1,0) rotated -90 deg -> x');
    assertFloatClose(assert, rotated.y, -1, 1e-9, '(1,0) rotated -90 deg -> y');
    rotated = rotateVector(1, 1, 45);
    assertFloatClose(assert, rotated.x, 0, 1e-9, '(1,1) rotated 45 deg -> x');
    assertFloatClose(assert, rotated.y, Math.sqrt(2), 1e-9, '(1,1) rotated 45 deg -> y');
    rotated = rotateVector(3, 4, 0);
    assertFloatClose(assert, rotated.x, 3, 1e-9, '(3,4) rotated 0 deg -> x');
    assertFloatClose(assert, rotated.y, 4, 1e-9, '(3,4) rotated 0 deg -> y');
    rotated = rotateVector(3, 4, 360);
    assertFloatClose(assert, rotated.x, 3, 1e-9, '(3,4) rotated 360 deg -> x');
    assertFloatClose(assert, rotated.y, 4, 1e-9, '(3,4) rotated 360 deg -> y');
  });
  QUnit.test('projectVector', function(assert) {
    let proj = projectVector(1, 1, 1, 0);
    assertFloatClose(assert, proj.x, 1, 1e-9, 'Project (1,1) onto (1,0) -> x');
    assertFloatClose(assert, proj.y, 0, 1e-9, 'Project (1,1) onto (1,0) -> y');
    proj = projectVector(1, 1, 0, 1);
    assertFloatClose(assert, proj.x, 0, 1e-9, 'Project (1,1) onto (0,1) -> x');
    assertFloatClose(assert, proj.y, 1, 1e-9, 'Project (1,1) onto (0,1) -> y');
    proj = projectVector(1, 0, 1, 1);
    assertFloatClose(assert, proj.x, 0.5, 1e-9, 'Project (1,0) onto (1,1) -> x');
    assertFloatClose(assert, proj.y, 0.5, 1e-9, 'Project (1,0) onto (1,1) -> y');
    proj = projectVector(1, 1, 0, 0);
    assert.deepEqual(proj, { x: 0, y: 0 }, 'Project onto zero vector');
  });
});

QUnit.module('physics.orbitalMechanics', function(hooks) {
  const assertFloatClose = globalAssertFloatClose;
  let originalPositionX, originalPositionY, originalRocketVelocityX, originalRocketVelocityY;

  hooks.beforeEach(function() {
    originalPositionX = window.positionX; originalPositionY = window.positionY;
    originalRocketVelocityX = window.rocketVelocityX; originalRocketVelocityY = window.rocketVelocityY;
  });
  hooks.afterEach(function() {
    window.positionX = originalPositionX; window.positionY = originalPositionY;
    window.rocketVelocityX = originalRocketVelocityX; window.rocketVelocityY = originalRocketVelocityY;
  });

  QUnit.test('calculateCentripetalAcceleration', function(assert) {
    assertFloatClose(assert, calculateCentripetalAcceleration(10, 5), 20, 1e-9, 'Positive velocity and radius');
    assert.strictEqual(calculateCentripetalAcceleration(0, 5), 0, 'Zero velocity');
    assert.strictEqual(calculateCentripetalAcceleration(10, 0), 0, 'Zero radius (SUT returns 0)');
  });
  QUnit.test('calculateOrbitalVelocity', function(assert) {
    const M = EARTH_MASS_physicsJs;
    const r = 7e6;
    assertFloatClose(assert, calculateOrbitalVelocity(M, r), Math.sqrt(G_physics * M / r), 1e-3, 'Positive mass and distance');
    assert.strictEqual(calculateOrbitalVelocity(M, 0), 0, 'Zero distance (SUT returns 0)');
  });
  QUnit.test('calculateEscapeVelocity', function(assert) {
    const M = EARTH_MASS_physicsJs;
    const r = 7e6;
    assertFloatClose(assert, calculateEscapeVelocity(M, r), Math.sqrt(2 * G_physics * M / r), 1e-3, 'Positive mass and distance');
    assert.strictEqual(calculateEscapeVelocity(M, 0), 0, 'Zero distance (SUT returns 0)');
  });

  QUnit.test('calculateSpecificOrbitalEnergy', function(assert) {
    const earth = physicsJsCelestialBodies.earth;
    const r_orbit = EARTH_RADIUS_physicsJs + 3e5;
    window.positionX = earth.x + r_orbit;
    window.positionY = earth.y;
    const v_orbit_around_earth = calculateOrbitalVelocity(earth.mass, r_orbit);
    window.rocketVelocityX = v_orbit_around_earth;
    window.rocketVelocityY = 0;
    let totalExpectedSpecificPE = 0;
    for (const bodyName in physicsJsCelestialBodies) {
        const body = physicsJsCelestialBodies[bodyName];
        const distance = calculateDistance(window.positionX, window.positionY, body.x, body.y);
        if (distance > 0) {
            totalExpectedSpecificPE -= (G_physics * body.mass) / distance;
        }
    }
    const specificKE = 0.5 * v_orbit_around_earth * v_orbit_around_earth;
    const expectedEnergy = specificKE + totalExpectedSpecificPE;
    assertFloatClose(assert, calculateSpecificOrbitalEnergy(), expectedEnergy, Math.abs(expectedEnergy * 0.1) + 100, 'Specific orbital energy (all bodies PE sum)');
  });

  QUnit.test('calculateSemiMajorAxis', function(assert) {
    const earth = physicsJsCelestialBodies.earth;
    const r_orbit_around_earth = EARTH_RADIUS_physicsJs + 3e5;
    window.positionX = earth.x + r_orbit_around_earth;
    window.positionY = earth.y;
    const v_orbit = calculateOrbitalVelocity(earth.mass, r_orbit_around_earth);
    window.rocketVelocityX = v_orbit;
    window.rocketVelocityY = 0;
    let totalSPE_for_calc = 0;
    for (const bodyName in physicsJsCelestialBodies) {
        const body = physicsJsCelestialBodies[bodyName];
        const distance = calculateDistance(window.positionX, window.positionY, body.x, body.y);
        if (distance > 0) {
            totalSPE_for_calc -= (G_physics * body.mass) / distance;
        }
    }
    const specificKE_for_calc = 0.5 * v_orbit * v_orbit;
    const specificEnergy_calculated_for_test = specificKE_for_calc + totalSPE_for_calc;
    const expected_a_circular = -G_physics * earth.mass / (2 * specificEnergy_calculated_for_test);
    assertFloatClose(assert, calculateSemiMajorAxis(earth.mass), expected_a_circular, Math.abs(expected_a_circular * 0.1) + 1000, 'Semi-major axis (Earth central, all bodies PE)');

    window.positionX = earth.x + r_orbit_around_earth;
    window.positionY = earth.y;
    let totalSPE_for_escape_calc = 0;
    for (const bodyName in physicsJsCelestialBodies) {
        const body = physicsJsCelestialBodies[bodyName];
        const distance = calculateDistance(window.positionX, window.positionY, body.x, body.y);
        if (distance > 0) {
            totalSPE_for_escape_calc -= (G_physics * body.mass) / distance;
        }
    }
    const targetSpecificKE_for_escape = Math.abs(totalSPE_for_escape_calc) + 10000;
    const v_escape_system = Math.sqrt(2 * targetSpecificKE_for_escape);
    window.rocketVelocityX = v_escape_system;
    window.rocketVelocityY = 0;
    const currentSpecificEnergyForEscape = calculateSpecificOrbitalEnergy();
    // console.log("DEBUG: Current Specific Energy for Escape Orbit Case: " + currentSpecificEnergyForEscape); // Removed for final version
    assert.ok(currentSpecificEnergyForEscape >= 0, "Specific energy should be non-negative for escape trajectory. Actual: " + currentSpecificEnergyForEscape);
    assert.strictEqual(calculateSemiMajorAxis(earth.mass), Infinity, 'Semi-major axis for escape orbit (energy >= 0)');
  });
});

QUnit.module('physics.integration', function(hooks) {
  const assertFloatClose = globalAssertFloatClose;
  let initialFuel;

  hooks.beforeEach(function(assert) {
    resetRocket();
    initialFuel = window.rocketFuel;
  });

  QUnit.test('Rocket responds to thrust (and consumes fuel)', function(assert) {
    window.angle = 0;
    window.rocketThrust = 5000;
    calculateRocketThrust();
    assert.ok(window.rocketFuel < initialFuel, 'Fuel should decrease. Initial: ' + initialFuel + ', Current: ' + window.rocketFuel);
    const fuelAfterTick = window.rocketFuel;
    const result = updateRocketPhysics(1.0);
    assert.ok(result.velocity.x > 0, 'RocketVelocityX positive. Actual: ' + result.velocity.x);
    assertFloatClose(assert, result.velocity.y, 0, 1e-1, 'RocketVelocityY close to 0. Actual: ' + result.velocity.y);
    assert.ok(result.position.x > 0, 'PositionX positive. Actual: ' + result.position.x);
    assertFloatClose(assert, result.position.y, 0, 1e-1, 'PositionY close to 0. Actual: ' + result.position.y);
    assertFloatClose(assert, window.rocketFuel, fuelAfterTick, 1e-9, "updateRocketPhysics does not alter fuel.");
  });

  QUnit.test('Rocket responds to rotation (thrust vector changes, consumes fuel)', function(assert) {
    window.angle = 90;
    window.rocketThrust = 5000;
    calculateRocketThrust();
    assert.ok(window.rocketFuel < initialFuel, 'Fuel should decrease. Initial: ' + initialFuel + ', Current: ' + window.rocketFuel);
    const fuelAfterTick = window.rocketFuel;
    const result = updateRocketPhysics(1.0);
    assertFloatClose(assert, result.velocity.x, 0, 1e-1, 'RocketVelocityX close to 0. Actual: ' + result.velocity.x);
    assert.ok(result.velocity.y > 0, 'RocketVelocityY positive. Actual: ' + result.velocity.y);
    assertFloatClose(assert, result.position.x, 0, 1e-1, 'PositionX close to 0. Actual: ' + result.position.x);
    assert.ok(result.position.y > 0, 'PositionY positive. Actual: ' + result.position.y);
    assertFloatClose(assert, window.rocketFuel, fuelAfterTick, 1e-9, "updateRocketPhysics does not alter fuel.");
  });

  QUnit.test('Rocket is affected by planetary gravity (Earth)', function(assert) {
    window.rocketThrust = 0;
    window.positionX = physicsJsCelestialBodies.earth.x + EARTH_RADIUS_physicsJs + 100000;
    window.positionY = physicsJsCelestialBodies.earth.y;
    const initialPosX = window.positionX;
    const result = updateRocketPhysics(1.0);
    assert.ok(result.velocity.x < 0, 'RocketVelocityX negative (pulled towards Earth). Actual: ' + result.velocity.x);
    assertFloatClose(assert, result.velocity.y, 0, 1e-1, 'RocketVelocityY close to 0. Actual: ' + result.velocity.y);
    assert.ok(window.positionX < initialPosX, 'PositionX should decrease. Initial: ' + initialPosX + ', Final: ' + window.positionX);
  });

  QUnit.test('Rocket runs out of fuel and thrust stops', function(assert) {
    window.rocketFuel = 0.05;
    window.angle = 0;
    window.rocketThrust = 10000;

    const posX_at_start_of_step = window.positionX;
    const posY_at_start_of_step = window.positionY;
    const velX_at_start_of_step = window.rocketVelocityX;

    calculateRocketThrust();

    assertFloatClose(assert, window.rocketFuel, 0, 0.0001, "Fuel depleted. Actual: " + window.rocketFuel);
    assertFloatClose(assert, window.rocketThrust, 0, 0.001, "Thrust zero after fuel depletion. Actual: " + window.rocketThrust);

    let expected_coast_ax = 0;
    for (const bodyName in physicsJsCelestialBodies) {
        if (bodyName === "sun" && posX_at_start_of_step === physicsJsCelestialBodies.sun.x && posY_at_start_of_step === physicsJsCelestialBodies.sun.y) {
            continue;
        }
        const body = physicsJsCelestialBodies[bodyName];
        const dx = body.x - posX_at_start_of_step;
        const dy = body.y - posY_at_start_of_step;
        const distSq = dx*dx + dy*dy;
        const dist = Math.sqrt(distSq);
        if (dist === 0) continue;
        const forceMag = (G_physics * body.mass * ROCKET_MASS_physics) / distSq;
        expected_coast_ax += forceMag * (dx / dist);
    }
    expected_coast_ax /= ROCKET_MASS_physics;

    const result = updateRocketPhysics(1.0);

    assertFloatClose(assert, result.acceleration.x, expected_coast_ax, 1e-9, "Acceleration during coast should match calculated gravity at start of coast");
    assertFloatClose(assert, result.velocity.x - velX_at_start_of_step, expected_coast_ax * 1.0, 1e-9, "Velocity change during coast");
  });

  QUnit.test('Rocket at Sun-Earth L1-like point (simplified)', function(assert) {
    window.rocketThrust = 0;
    window.rocketVelocityX = 0;
    window.rocketVelocityY = 0;
    const earth = physicsJsCelestialBodies.earth;
    window.positionX = earth.x * 0.99;
    window.positionY = earth.y;
    const result = updateRocketPhysics(1.0);
    assert.ok(result.velocity.x < 0, 'RocketVelocityX negative (pulled towards Sun). Actual: ' + result.velocity.x);
  });
});
