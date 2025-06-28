# Space Flight Simulator

A web-based interactive space flight simulator that teaches orbital mechanics and physics through gameplay. This project was created for the SpaceHacks competition.

![Space Flight Simulator](https://via.placeholder.com/800x400?text=Space+Flight+Simulator)

## Overview

The Space Flight Simulator allows users to experiment with spacecraft navigation in a physics-accurate environment. By controlling a virtual spacecraft, users can learn about orbital mechanics, gravitational forces, and Newtonian physics through direct interaction and guided missions.

This project addresses the "Orbital Navigation & Flight Path Optimization" and "Space Exploration Visualizer" tracks of the SpaceHacks competition.

## Features

- Real-time physics simulation based on Newtonian mechanics and gravitational forces
- Interactive spacecraft controls (W/A/S/D keyboard inputs)
- Realistic orbital mechanics
- Educational content explaining physics principles as you play
- Mission-based objectives to guide learning
- Visual representation of spacecraft trajectory and celestial bodies
- Heads-up display showing relevant flight data

## How to Use

1. Open the `index.html` file in a modern web browser, or visit the GitHub Pages deployment.
2. Click "Start Simulation" to begin.
3. Use the following controls:
   - `W`: Accelerate (fire main engines)
   - `A`: Rotate spacecraft left
   - `D`: Rotate spacecraft right
   - `S`: Brake/Reverse thrust
   - `F`: Toggle camera follow mode
   - `+`: Zoom in
   - `-`: Zoom out
   - `R`: Reset simulation
   - `H` or `?`: Show help

4. Try to complete the mission objectives displayed in the control panel.
5. Click on the Physics Info panel to learn more about the current physics principle being demonstrated.

## Educational Value

This simulator demonstrates several key physics concepts:

- **Newton's Laws of Motion**: Experience how objects remain in motion unless acted upon by forces.
- **Orbital Mechanics**: Learn to achieve and maintain stable orbits around celestial bodies.
- **Gravitational Forces**: Observe how gravity affects your spacecraft based on distance and mass.
- **Conservation of Momentum**: See how changes in velocity affect your spacecraft's trajectory.
- **Fuel Management**: Experience the limitations of real-world spacecraft operations.

## Technical Implementation

This project is built using:
- HTML5 for structure
- CSS3 for styling
- JavaScript for physics calculations and rendering
- Canvas API for visualization

The physics engine implements:
- Vector-based force calculations
- Gravitational force simulation
- Numerical integration for solving equations of motion
- Collision detection

## Local Development

To run this project locally:

1. Clone the repository
2. Open `index.html` in a web browser
3. No build steps or dependencies required

## Future Enhancements

- Additional spacecraft options with different characteristics
- More celestial bodies and complex mission scenarios
- Multiplayer capabilities
- Mobile device support through touch controls
- Additional educational content and guided tutorials

## License

This project is released under the MIT License - see the LICENSE file for details. 