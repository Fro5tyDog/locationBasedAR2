// wait for dom to finish loading before loading models and updating UI
document.addEventListener('DOMContentLoaded', function () {
        initializeMyApp();
});

// Step 1 --------------------------------
// Create dropdown containers

// --- Variables
let dropdownVisible = false; // Toogle to hide and unhide dropdown containers
let selectedIcon = null; // Track the currently selected icon
let shouldRunLoop = true; // Flag to control closestModelLoop

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
async function selectNewModel(name){

    //1. cancel the closest Model loop
    const cancelLoop = await cancelClosestModelLoop(); 
    console.log(cancelLoop);
    //2. call for the player's position
    //3. Set all models to be invisible
    //4. call JSON and find out the lat and lng of the selected model. 
    //5. Call for UI updates 
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
function startUp(){
    // Remove the "greyed-out" class from other UI elements
    document.querySelector('.circle-container').classList.remove('greyed-out');
    document.getElementById('top-left-circle').classList.remove('greyed-out');

    // Identify the closet target based on distancemsg. 
    shouldRunLoop = true; // Set flag to true to allow the loop to run
    updateClosestModelLoop();

    // Update the UI with the player's position and the closest model.
    // const playerLocation = document.getElementById('player-location');
    // playerLocation.innerHTML = `Player's location: (${playerPosition.latitude}, ${playerPosition.longitude})`;
    // updateArrowUI();

    

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
                let minDistance;
                let maxDistance;
                let model_latitude;
                let model_longitude;
                const closestModelDetails = {
                    closestDistance: closestDistance,
                    closestModel: closestModel,
                    tooClose: tooClose,
                    tooFar: tooFar,
                    minDistance: minDistance,
                    maxDistance: maxDistance,
                    modelLat: model_latitude,
                    modelLng: model_longitude
                };
                 models.forEach(modelSeparated => {
                    model_latitude_current = modelSeparated.location.lat;
                    model_longitude_current = modelSeparated.location.lng;
                    const player_latitude = playerPosition.lat;
                    const player_longitude = playerPosition.lng;

                    // Get model entity in the scene
                    const modelEntity = document.querySelector(`.${modelSeparated.name}`);
                    modelEntity.object3D.visible = false;

                    const distanceBetweenPlayerAndModel = Number(calculateDistance(player_latitude, player_longitude, model_latitude_current, model_longitude_current));
                    
                    // console.log(distanceBetweenPlayerAndModel);
                    if (closestDistance === 0 || distanceBetweenPlayerAndModel < closestDistance) {
                        closestDistance = distanceBetweenPlayerAndModel;
                        closestModel = modelSeparated.name;
                        // Visibility range from JSON
                        minDistance = modelSeparated.visibilityRange.min;
                        maxDistance = modelSeparated.visibilityRange.max;

                        //set the lat and lng values
                        model_latitude = model_latitude_current;
                        model_longitude = model_longitude_current;

                        // Adjust visibility based on distance
                        if (distanceBetweenPlayerAndModel >= minDistance && distanceBetweenPlayerAndModel <= maxDistance) {
                            tooClose = false;
                            tooFar = false;
                        } else {
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
                closestModelDetails.minDistance = minDistance;
                closestModelDetails.maxDistance = maxDistance;
                closestModelDetails.modelLat = model_latitude;
                closestModelDetails.modelLng = model_longitude;
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
    if(!shouldRunLoop) return; // exit if loop is cancelled
    try {
        const playerPosition = await getPlayerPosition();
        const closestModel = await adjustModelProperties(playerPosition);

        console.log(closestModel);
        
        // Update the UI with the closest model information
        // Math.floor(closestModel.closestDistance)
        const updateUI_Models = await updateLocationDisplayUI(closestModel.closestDistance, closestModel.closestModel, closestModel.tooClose, closestModel.tooFar, closestModel.minDistance, closestModel.maxDistance);

        //Update arrow based on bearing 
        // updateArrowUI(playerPosition, closestModel.modelLat, closestModel.modelLng);

        // Call recursively on the next frame
        updateClosestModelLoopID = requestAnimationFrame(updateClosestModelLoop);
    } catch (error) {
        console.error("Error updating closest model:", error);
    }
}

function cancelClosestModelLoop(){
    return new Promise((resolve, reject) => {
        try{
            shouldRunLoop = false; // Set the flag to false to stop scheduling new frames
            cancelAnimationFrame(updateClosestModelLoopID); // Cancel the current frame if it’s pending
            resolve(true);
        }
        catch(error){
            reject(error);
        }
    })
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

// Converts from degrees to radians.
function toRadians(degrees) {
    return degrees * Math.PI / 180;
};

// Converts from radians to degrees.
function toDegrees(radians) {
    return radians * 180 / Math.PI;
}


function calculateBearing(playerPos, modelPos){
    startLat = toRadians(playerPos.lat);
    startLng = toRadians(playerPos.lng);
    destLat = toRadians(modelPos.lat);
    destLng = toRadians(modelPos.lng);

    y = Math.sin(destLng - startLng) * Math.cos(destLat);
    x = Math.cos(startLat) * Math.sin(destLat) -
            Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
    brng = Math.atan2(y, x);
    brng = toDegrees(brng);
    return (brng + 360) % 360;
}

// functions to calcuate angle the arrow should rotate.
// function calculateBearing(playerPos, modelPos) {
// //     const lat1 = toRadians(playerPos.lat);
// //     const lat2 = toRadians(modelPos.lat);
// //     const deltaLon = toRadians(modelPos.lng - playerPos.lng);

// //     const y = Math.sin(deltaLon) * Math.cos(lat2);
// //     const x = Math.cos(lat1) * Math.sin(lat2) - 
// //               Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
// //     const bearing = Math.atan2(y, x);
    
// //     // Convert from radians to degrees and normalize between 0-360
// //     return (toDegrees(bearing) + 360) % 360;
// // }

// // function toRadians(degrees) {
// //     return degrees * (Math.PI / 180);
// // }

// // function toDegrees(radians) {
// //     return radians * (180 / Math.PI);
// // }



// starts updating the UI.
// let rotationAngle = 0; // Keep track of the current rotation angle

function updateArrowUI(playerPosition, modelLat, modelLng) {
    // Update arrow rotation

    const modelPos = {
        lat: modelLat,  // adjust if necessary based on your data structure
        lng: modelLng
    };
    const rotationAngle = calculateBearing(playerPosition, modelPos);
    const arrow = document.querySelector(".arrow");
    // rotationAngle += 1; // Increment the rotation angle
    arrow.style.transform = `translate(-50%, -50%) rotate(${rotationAngle}deg)`;

    // Keep the rotation between 0 and 360 degrees
    // if (rotationAngle >= 360) {
    //     rotationAngle = 0; // Reset to 0 after a full rotation
    // }

    // Call the function recursively on each animation frame
    requestAnimationFrame(updateArrowUI);
}

// async function updateArrowUI(playerPosition, modelLat, modelLng) {
//     try{  
//         const playerPosition = await getPlayerPosition();
//         const closestModelDetails = await adjustModelProperties(playerPosition);
        
//         // Assume closestModelDetails includes lat and lng of the closest model
//         const modelPos = {
//             lat: closestModelDetails.modelLat,  // adjust if necessary based on your data structure
//             lng: closestModelDetails.modelLng
//         };

//         // console.log(playerPosition);

//         // Calculate the bearing angle to the model
        

//         // Apply rotation to the arrow
//         const arrow = document.querySelector(".arrow");
//         arrow.style.transform = `translate(-50%, -50%) rotate(${rotationAngle}deg)`;

//         // Call the function recursively on each animation frame
//         requestAnimationFrame(updateArrowUI);
//     } catch (error) {
//         console.error("Error updating arrow direction:", error);
//     }
// }


// UI update function
function updateLocationDisplayUI(distanceToTarget, target, tooClose, tooFar, minDistance, maxDistance) {

    return new Promise((resolve, reject) => {
        try{
            const locationDisplay = document.getElementById('location-display');

            // Get model entity in the scene
            const modelEntity = document.querySelector(`.${target}`);
            // console.log(modelEntity);

            // Adjust visibility based on distance
            // This keeps all other models invisible because we disabled them from the start and only enable them here.
            if (distanceToTarget >= minDistance && distanceToTarget <= maxDistance) {
                modelEntity.object3D.visible = true;
                // console.log('model is visible');
                // console.log(modelEntity.getAttribute('visible'));
            } else {
                modelEntity.setAttribute('visible', 'false');
                modelEntity.object3D.visible = false;
                // console.log('model is not visible');
                // console.log(modelEntity.getAttribute('visible'));
            }

            // change text depending on distance between player and model
            if(tooClose == false && tooFar == false){
                locationDisplay.innerHTML = `Distance to closest model, ${target}: \n${distanceToTarget.toFixed(2)} meters`;
                resolve(true);
            } else if (tooClose == true && tooFar == false) {
                locationDisplay.innerHTML = `Too close to ${target}!`;
                resolve(true);
            } else if (tooClose == false && tooFar == true) {
                locationDisplay.innerHTML = `Too far from ${target}!: \n${distanceToTarget.toFixed(2)} meters`;
                resolve(true);
            } else{
                locationDisplay.innerHTML = "No models found!";
                reject(false);
            }
        } 
        catch(error){
            reject(error);
        }
    })
    
}

async function initializeMyApp(){

    // 1.
    const modelRender = await renderModels();
    
    // 2.
    const dropdownRender = await createDropdownContainer();

    // 3.
    const startUpScreen = await createStartScreen();

}