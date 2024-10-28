let animationFrameId; // Store the animation frame ID globally



// wait for dom to finish loading before loading models and updating UI
document.addEventListener('DOMContentLoaded', function () {
        initializeMyApp();
});

// Step 1 --------------------------------
// Create dropdown containers

// --- Variables
let dropdownVisible = false; // Toogle to hide and unhide dropdown containers
let selectedIcon = null; // Track the currently selected icon

// --- Functions
function createDropdownContainer(){
    return new Promise((resolve, reject) => {
        
        try{
            const dropdownContainer = document.getElementById('dropdown-container'); // container housing all dropdown items
            const topLeftCircle = document.getElementById('top-left-circle'); // top left circle people click on to view more models.

            // handle visibility in another function. 
            topLeftCircle.addEventListener('click', modelDropDownVisibilityToggle);
            
            // fetch json to assign thumbnails based on names.
            fetch('./model_positions.json')
            .then(response => response.json())
            .then(data => {
                console.log('JSON loaded', data);
                createThumbnails(data);

                // resolve after thumbnails are created
                resolve(true);
            })
            .catch(error => {
                console.error('Error loading the JSON data:', error);
            });

            // Create the individual dropdown items.
            function createThumbnails(models){
                // Iterate over models and create thumbnails
                models.forEach(model => {
                    const thumbnail = document.createElement('div');
                    thumbnail.classList.add('dropdown-circle');
                    thumbnail.setAttribute('id', `${model.name}`);
                    // Create an image element for the model
                    const img = document.createElement('img');
                    img.src = `./assets/thumbnails/${model.name.toLowerCase()}.png`; // Assume icons follow model naming
                    img.alt = model.name;
                
                    // Append image to the circle
                    thumbnail.appendChild(img);

                    // apply all logic in separate function.
                    thumbnail.addEventListener('click', thumbnailClick)
                    // assign thumbnails to the container
                    dropdownContainer.appendChild(thumbnail);
                })
            }
        }
        catch(error){
            reject(error);
        }
        
    });

}

// Functions for DOM dropdown buttons
function modelDropDownVisibilityToggle(){
    const dropdownContainer = document.getElementById('dropdown-container'); // container housing all dropdown items
    dropdownVisible =!dropdownVisible;
    dropdownContainer.style.display = dropdownVisible? 'flex' : 'none';
}

// click event for thumbnails
function thumbnailClick(event){
    const clickedIcon = event.currentTarget; // Get the clicked thumbnail
    if(clickedIcon === selectedIcon){
        console.log('Already selected!');
    }
    else {
        // deselect previous icon
        if (selectedIcon) {
            selectedIcon.classList.remove('selected');
        }
        //select new icon
        clickedIcon.classList.add('selected');
        selectedIcon = clickedIcon;
        console.log(`selected icon ${selectedIcon.id}`);
        selectNewModel(clickedIcon.id);
    }
}

// What happens when you select a new model
function selectNewModel(name){
    const locationDisplay = document.getElementById('location-display');
    locationDisplay.innerHTML = `${name}`;   
}

// Step 2 --------------------------------
// Create models within a-frame
function renderModels(){
    return new Promise((resolve, reject) => {
        try{
            // Variables
            let scene = document.querySelector('a-scene');

            // fetch json to create models.
            fetch('./model_positions.json')
           .then(response => response.json())
           .then(data => {
                console.log('JSON loaded', data);
                createModels(data);

                // resolve after models are created
                resolve(true);
            })
           .catch(error => {
                console.error('Error loading the JSON data:', error);
            });
  
            // Function to create each model from the json.
            function createModels(models){
                models.forEach(modelSeparated => {
                    let latitude = modelSeparated.location.lat;
                    let longitude = modelSeparated.location.lng;
                    let filePath = modelSeparated.filePath;
                    let visibilityRange = modelSeparated.visibilityRange;
                    let name = modelSeparated.name;

                    console.log(`Creating model for: ${name} at (${latitude}, ${longitude}) with visibility range [${visibilityRange.min}m - ${visibilityRange.max}m]`);    

                    // Create a new entity for each place
                    let model = document.createElement('a-entity');
                    model.setAttribute('gps-projected-entity-place', `latitude: ${latitude}; longitude: ${longitude};`);
                    model.setAttribute('gltf-model', `${filePath}`);
                    model.setAttribute('rotation', '0 0 0');
                    model.setAttribute('animation-mixer', 'clip: *; loop: repeat; timeScale: 1.1; clampWhenFinished: true; crossFadeDuration: 0.3');
                    model.setAttribute('look-at', '[camera]');
                    model.setAttribute('scale', '0.15 0.15 0.15'); // Initial scale
                    model.setAttribute('visible', 'false'); // Initially invisible 
                    
                    // append to scene first before checking if it's loaded
                    scene.appendChild(model);

                    model.addEventListener('model-loaded', () => {
                        model.classList.add(`${name}`);
                        console.log('model loaded');
                    })
                })
            }
        } 
        catch(error){
            reject(error);
        }
    })
}

// async function initilizeMyApp()
// Order
// 1. Create dropdown containers with models assign to them.
// 2. Create models within a-frame
// 3. Start Up Button.

// Step 3 --------------------------------
// Start Up Button

function createStartScreen(){
    return new Promise((resolve, reject) => {
        // adding greyed-out class to prevent person from clicking on icons
        document.querySelector('.circle-container').classList.add('greyed-out');
        document.getElementById('top-left-circle').classList.add('greyed-out');
        try{
             // Handle "Tap to Start" button click
             document.getElementById('start-button').addEventListener('click', startUp);

            resolve(true);
        } 
        catch(error){
            reject(error);
        }   
    })
}

// enabling UI and a-frame models to be seen once start button is clicked 
async function startUp(){
    // Remove the "greyed-out" class from other UI elements
    document.querySelector('.circle-container').classList.remove('greyed-out');
    document.getElementById('top-left-circle').classList.remove('greyed-out');

    // Check for all a-entity elements and set their visibility to true
    // Update the innnerHTML to display cloest model to the player.
    const entities = document.querySelectorAll('a-entity');
    entities.forEach((entity) => {
        entity.setAttribute('visible', 'true');
    });

    // Identify the closet target based on distancemsg. 
    updateClosestModelLoop();

    // Update the UI with the player's position and the closest model.
    // const playerLocation = document.getElementById('player-location');
    // playerLocation.innerHTML = `Player's location: (${playerPosition.latitude}, ${playerPosition.longitude})`;
    updateArrowUI();

    

    // Hide the start screen
    document.querySelector('.start').classList.add('hidden');

    // call async functions here to run sequentially.
    
    // await closestModelToPlayer();
    // await updateText();
    // await updateArrow();

    console.log("START!");
}

function getPlayerPosition(){
    return new Promise((resolve, reject) => {
        try{
             if(navigator.geolocation){

                const options = {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                  };
                  
                  function success(pos) {
                    const position = pos.coords;
                  
                    console.log("Your current position is:");
                    console.log(`Latitude : ${position.latitude}`);
                    console.log(`Longitude: ${position.longitude}`);
                    console.log(`More or less ${position.accuracy} meters.`);

                    const playerPos = {
                        lat: position.latitude, 
                        lng: position.longitude
                    };
                    resolve(playerPos);
                  }
                  
                  function error(err) {
                    console.warn(`ERROR(${err.code}): ${err.message}`);
                    reject(err);
                  }

                  navigator.geolocation.getCurrentPosition(success, error, options);
                  
             } else {
                console.error("Geolocation is not supported by this browser.");
                reject(false);
             }
        } 
        catch(error){
            reject(error);
        }   
    })
}

function adjustModelProperties(playerPosition){
    return new Promise((resolve, reject) => {
        try{
            // fetch json to find models positions.
            fetch('./model_positions.json')
            .then(response => response.json())
            .then(data => {
                 console.log('JSON loaded', data);
                 getModelPosition(data);
 
                 // resolve after models are created
                 resolve(true);
             })
            .catch(error => {
                 console.error('Error loading the JSON data:', error);
             });
   
             // Function to create each model from the json.
             function getModelPosition(models){
                //variable to establish closest model
                let closestDistance = 0;
                let closestModel;
                let tooClose = false;
                let tooFar = false;
                const closestModelDetails = {
                    closestDistance: closestDistance,
                    closestModel: closestModel,
                    tooClose: tooClose,
                    tooFar: tooFar
                };
                 models.forEach(modelSeparated => {
                    const model_latitude = modelSeparated.location.lat;
                    const model_longitude = modelSeparated.location.lng;
                    const player_latitude = playerPosition.lat;
                    const player_longitude = playerPosition.lng;

                    const distanceBetweenPlayerAndModel = Number(calculateDistance(player_latitude, player_longitude, model_latitude, model_longitude));
                    
                    console.log(distanceBetweenPlayerAndModel);
                    if (closestDistance === 0 || distanceBetweenPlayerAndModel < closestDistance) {
                        closestDistance = distanceBetweenPlayerAndModel;
                        closestModel = modelSeparated.name;
                        // Visibility range from JSON
                        const minDistance = modelSeparated.visibilityRange.min;
                        const maxDistance = modelSeparated.visibilityRange.max;
                        
                        // Get model entity in the scene
                        const modelEntity = document.querySelector(`.${modelSeparated.name}`);

                        // Adjust visibility based on distance and modal visibility
                        if (distanceBetweenPlayerAndModel >= minDistance && distanceBetweenPlayerAndModel <= maxDistance) {
                            modelEntity.setAttribute('visible', 'true');
                            tooClose = false;
                            tooFar = false;
                        } else {
                            modelEntity.setAttribute('visible', 'false');
                            if(distanceBetweenPlayerAndModel < minDistance) {
                                tooClose = true;
                            } else{
                                tooFar = true;
                            }
                        }
                    }                 
                })
                closestModelDetails.closestDistance = closestDistance;
                closestModelDetails.closestModel = closestModel;
                closestModelDetails.tooClose = tooClose;
                closestModelDetails.tooFar = tooFar;
                resolve(closestModelDetails);
            }
                
        } 
        catch(error){
            reject(error);
        }   
    })

}

let updateClosestModelLoopID; 

async function updateClosestModelLoop() {
    try {
        const playerPosition = await getPlayerPosition();
        const closestModel = await adjustModelProperties(playerPosition);
        
        // Update the UI with the closest model information
        // Math.floor(closestModel.closestDistance)
        updateLocationDisplayUI(closestModel.closestDistance, closestModel.closestModel, closestModel.tooClose, closestModel.tooFar);

        //Update visibility of the model based on the min max distance. 
        
        // Call recursively on the next frame
        updateClosestModelLoopID = requestAnimationFrame(updateClosestModelLoop);
    } catch (error) {
        console.error("Error updating closest model:", error);
    }
}

function cancelClosesModelLoop(){
    cancelAnimationFrame(updateClosestModelLoopID);
}
    

function calculateDistance(lat1,lon1,lat2,lon2){
    try{
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2-lat1);  // deg2rad below
        var dLon = deg2rad(lon2-lon1); 
        var a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2)
            ; 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c; // Distance in km
        return(d * 1000); // send distance in meters
        
        function deg2rad(deg) {
        return deg * (Math.PI/180)
        }
    }
    catch(error){
        console.error(error);
    }  
}

// starts updating the UI.
let rotationAngle = 0; // Keep track of the current rotation angle

function updateArrowUI() {
    // Update arrow rotation
    const arrow = document.querySelector(".arrow");
    rotationAngle += 1; // Increment the rotation angle
    arrow.style.transform = `translate(-50%, -50%) rotate(${rotationAngle}deg)`;

    // Keep the rotation between 0 and 360 degrees
    if (rotationAngle >= 360) {
        rotationAngle = 0; // Reset to 0 after a full rotation
    }

    // Call the function recursively on each animation frame
    requestAnimationFrame(updateArrowUI);
}

// UI update function
function updateLocationDisplayUI(distanceToTarget, target, tooClose, tooFar) {
    const locationDisplay = document.getElementById('location-display');
    if(tooClose == false && tooFar == false){
        locationDisplay.innerHTML = `Distance to closest model, ${target}: \n${distanceToTarget.toFixed(2)} meters`;
    } else if (tooClose == true && tooFar == false) {
        locationDisplay.innerHTML = `Too close to ${target}!`;
    } else if (tooClose == false && tooFar == true) {
        locationDisplay.innerHTML = `Too far from ${target}!: \n${distanceToTarget.toFixed(2)} meters`;
    } else{
        locationDisplay.innerHTML = "No models found!";
    }
}

async function initializeMyApp(){

    // 1.
    const dropdownRender = await createDropdownContainer();

    // 2.
    const modelRender = await renderModels();

    // 3.
    const startUpScreen = await createStartScreen();

}