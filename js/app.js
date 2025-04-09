/**
 * Main Application Module
 * 
 * Initializes the simulation and handles user interaction
 */

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // Create simulation instance
    const simulation = new Simulation();
    
    // Set up UI event listeners
    const startButton = document.getElementById('start-btn');
    const resetButton = document.getElementById('reset-btn');
    const helpButton = document.getElementById('help-btn');
    
    // Start/pause simulation
    startButton.addEventListener('click', () => {
        simulation.start();
    });
    
    // Reset simulation
    resetButton.addEventListener('click', () => {
        simulation.reset();
    });
    
    // Show help/tutorial
    helpButton.addEventListener('click', () => {
        simulation.showTutorial();
    });
    
    // Handle keyboard input
    document.addEventListener('keydown', (event) => {
        handleKeyboardInput(event.key.toLowerCase(), true);
    });
    
    document.addEventListener('keyup', (event) => {
        handleKeyboardInput(event.key.toLowerCase(), false);
    });
    
    function handleKeyboardInput(key, isKeyDown) {
        // Control the spacecraft
        simulation.handleInput(key, isKeyDown);
        
        // Other keyboard controls
        if (isKeyDown) {
            switch (key) {
                case ' ':
                    simulation.start(); // Space bar toggles pause/resume
                    break;
                case 'r':
                    simulation.reset(); // R resets simulation
                    break;
                case 'h':
                    simulation.showTutorial(); // H shows help
                    break;
                case '1':
                    simulation.setTimeScale(0.5); // Slow time
                    break;
                case '2':
                    simulation.setTimeScale(1.0); // Normal time
                    break;
                case '3':
                    simulation.setTimeScale(2.0); // Fast time
                    break;
                case '4':
                    simulation.setTimeScale(5.0); // Very fast time
                    break;
                case '5':
                    simulation.setTimeScale(10.0); // Super fast time
                    break;
            }
        }
    }
    
    // Automatically show tutorial on first load
    setTimeout(() => {
        simulation.showTutorial();
    }, 500);
    
    // Optional: Educational content toggle
    let displayingDetails = false;
    document.getElementById('physics-info').addEventListener('click', () => {
        const principle = simulation.physicsTopics[simulation.currentTopic];
        if (!displayingDetails) {
            // Show detailed explanation
            document.getElementById('physics-info').innerHTML = `
                <h4>${principle.name}</h4>
                <p>${principle.description}</p>
                <p class="explanation-detail">
                    This principle is demonstrated in the simulation as you control your spacecraft.
                    Observe how ${
                        principle.name === "Newton's First Law" ? 
                            "your spacecraft continues moving even when not applying thrust." :
                        principle.name === "Newton's Second Law" ? 
                            "applying thrust changes your acceleration based on your spacecraft's mass." :
                        principle.name === "Orbital Mechanics" ? 
                            "maintaining the right velocity and distance creates a stable orbit." :
                        principle.name === "Conservation of Momentum" ? 
                            "your momentum is maintained unless external forces are applied." :
                        principle.name === "Gravitational Force" ? 
                            "gravity becomes weaker as you move further from celestial bodies."
                    }
                </p>
                <p class="tip">Click to minimize</p>
            `;
        } else {
            // Reset to simple display
            document.getElementById('physics-info').innerHTML = `
                <p>Experiment with orbital mechanics! Try to achieve a stable orbit around celestial bodies.</p>
                <p>Current Physics Principle: <span id="current-principle">${principle.name}</span></p>
            `;
        }
        displayingDetails = !displayingDetails;
    });
    
    // Create mission objectives
    const missions = [
        {
            name: "Achieve Stable Orbit",
            description: "Reach a stable circular orbit around Earth.",
            checkCompletion: () => {
                // Get the Earth (first celestial body)
                const earth = simulation.physicsEngine.celestialBodies[0];
                
                // Calculate distance to Earth center and speed
                const dx = simulation.spacecraft.position.x - earth.position.x;
                const dy = simulation.spacecraft.position.y - earth.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const speed = simulation.spacecraft.getSpeed();
                
                // Calculate orbital speed required for circular orbit at this distance
                const orbitalSpeed = Math.sqrt(simulation.physicsEngine.G * earth.mass / distance);
                
                // Calculate relative velocity direction (to check if it's perpendicular to radius)
                const radialDirection = {
                    x: dx / distance,
                    y: dy / distance
                };
                
                // Dot product of velocity and radial direction (closer to 0 = more circular)
                const dotProduct = Math.abs(
                    simulation.spacecraft.velocity.x * radialDirection.x + 
                    simulation.spacecraft.velocity.y * radialDirection.y
                );
                
                // Speed is within 5% of required orbital speed, altitude is above 100km,
                // and velocity is mostly perpendicular to radius (for circular orbit)
                const speedDifference = Math.abs(speed - orbitalSpeed);
                return speedDifference < orbitalSpeed * 0.05 && 
                       distance - earth.radius > 100000 &&
                       dotProduct < speed * 0.2; // Direction is within ~12 degrees of perpendicular
            }
        },
        {
            name: "Lunar Approach",
            description: "Approach the Moon within 50,000 km.",
            checkCompletion: () => {
                const moon = simulation.physicsEngine.celestialBodies[1];
                const spacecraft = simulation.spacecraft;
                const dx = spacecraft.position.x - moon.position.x;
                const dy = spacecraft.position.y - moon.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance < 50000000; // 50,000 km in meters
            }
        }
    ];
    
    // Add mission objective checking to the game loop
    let activeMission = 0;
    let missionCompleted = false;
    
    // Add a mission objective display to the DOM
    const controlPanel = document.querySelector('.control-panel');
    const missionSection = document.createElement('div');
    missionSection.className = 'panel-section';
    missionSection.innerHTML = `
        <h3>Mission Objective</h3>
        <div id="mission-objective" class="info-box">
            <p id="mission-name">${missions[activeMission].name}</p>
            <p id="mission-description">${missions[activeMission].description}</p>
            <p id="mission-status">Status: In Progress</p>
        </div>
    `;
    controlPanel.appendChild(missionSection);
    
    // Check mission completion periodically
    setInterval(() => {
        if (!simulation.isRunning || simulation.isPaused || missionCompleted) return;
        
        if (missions[activeMission].checkCompletion()) {
            // Mission completed
            document.getElementById('mission-status').textContent = 'Status: Completed!';
            document.getElementById('mission-status').style.color = 'var(--success-color)';
            
            missionCompleted = true;
            
            // Show mission completion modal
            const modal = document.getElementById('modal');
            const modalContent = document.getElementById('modal-content');
            
            modalContent.innerHTML = `
                <h2>Mission Complete!</h2>
                <p>You have successfully completed the mission: ${missions[activeMission].name}</p>
                <p>This demonstrates your understanding of orbital mechanics and spacecraft control.</p>
                <p>Ready for the next challenge?</p>
                <button id="next-mission-btn" class="primary-btn">Next Mission</button>
            `;
            
            modal.style.display = 'block';
            
            // Set up next mission button
            const nextMissionBtn = document.getElementById('next-mission-btn');
            nextMissionBtn.addEventListener('click', () => {
                activeMission = (activeMission + 1) % missions.length;
                document.getElementById('mission-name').textContent = missions[activeMission].name;
                document.getElementById('mission-description').textContent = missions[activeMission].description;
                document.getElementById('mission-status').textContent = 'Status: In Progress';
                document.getElementById('mission-status').style.color = 'var(--text-light)';
                missionCompleted = false;
                modal.style.display = 'none';
            });
        }
    }, 1000); // Check every second
});

// Add event listeners for close buttons
document.addEventListener('DOMContentLoaded', () => {
    // Close modal when clicking on x
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}); 