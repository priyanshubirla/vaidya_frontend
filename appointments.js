document.getElementById('sidebar-toggle').addEventListener('click', function() {
    const sidebar = document.getElementById('sidebar');
    const mainContainer = document.getElementById('main-container');
    const slotsContainer = document.getElementById('slots-container');
    const calendarContainer = document.getElementById('calendar-container');

    if (sidebar.style.width === '200px') {
        sidebar.style.width = '0';
        mainContainer.style.marginLeft = '0';
        slotsContainer.style.width = '100%';
        calendarContainer.style.width = '100%';
    } else {
        sidebar.style.width = '200px';
        mainContainer.style.marginLeft = '200px';
        slotsContainer.style.width = 'calc(100% - 200px)';
        calendarContainer.style.width = 'calc(100% - 200px)';
    }
});



// Initialize Flatpickr Calendar
flatpickr("#calendar", {
    inline: true,
    onChange: function(selectedDates, dateStr, instance) {
        fetchAppointments(dateStr);
    }
});

// Load appointments for today's date by default
const today = new Date();
fetchAppointments(today.toISOString().split('T')[0]);

function fetchAppointments(selectedDate) {
    const doctor = JSON.parse(localStorage.getItem('doctor'));

    if (!doctor || !doctor.userId) {
        alert("Please log in to view your appointments.");
        return;
    }

    const apiUrl = `http://localhost:8082/api/slots/search?date=${selectedDate}&userId=${doctor.userId}`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const slotsContainer = document.getElementById('slots-container');
            const appointmentsHeader = document.getElementById('appointments-header');
            
            appointmentsHeader.textContent = `Appointments, ${new Date(selectedDate).toDateString()}`;
            slotsContainer.innerHTML = '';

            if (data.length === 0) {
                slotsContainer.innerHTML = '<h4 id="no-slots">Please create slots for the selected date.</h4>';
            } else {
                // Initialize display ID
                let displaySlotId = 1; 

                data.forEach(slot => {
                    const slotElement = document.createElement('div');
                    slotElement.classList.add('slot');

                    // Create a hidden patient name element
                    const patientNameElement = document.createElement('p');
                    patientNameElement.classList.add('patient-nameee');

                    // Fetch patient name and add it to the slot element
                    fetchPatientName(slot.slotId, patientNameElement);

                    // Update the slot element with the incremented display ID
                    slotElement.innerHTML = `
                        <p><strong>Slot:</strong> ${displaySlotId}</p> 
                        <p><strong>Time:</strong> ${slot.startTime}</p>
                    `;

                    slotElement.appendChild(patientNameElement); // Append the patient name element

                    if (slot.status === "yes") {
                        slotElement.classList.add('green');
                        slotElement.addEventListener('click', function() {
                            showSearchForm(slot); // Pass the slot data directly
                        });
                    } else if (slot.status === "no") {
                        slotElement.classList.add('red');
                        slotElement.addEventListener('click', function() {
                            openModifyAppointmentForm(slot); // Open the modify form for blue slots
                        });
                    } else {
                        slotElement.classList.add('red');
                    }

                    slotsContainer.appendChild(slotElement);
                    displaySlotId++; // Increment the display ID for the next slot
                });
            }
        })
        .catch(error => console.error('Error fetching slots:', error));
}


// Function to fetch patient name based on slot ID
function fetchPatientName(slotId, patientNameElement) {
    fetch(`http://localhost:8083/api/patients/slot/${slotId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch patient data');
            }
            return response.json();
        })
        .then(patient => {
            // Set the patient name inside the patient name element
            const patientName = patient.patientName || 'No Name';
            patientNameElement.innerHTML = `<strong></strong> ${patientName}`;
        })
        .catch(error => {
            console.error("Error fetching patient data:", error);
        });
}





// Function to show the search form modal
function showSearchForm(slot) {
    const modal = document.getElementById("patient-search-modal");
    modal.style.display = "block";
    document.body.classList.add("modal-open");

    // Clear form fields
    document.getElementById("patient-form").reset(); // Clear the patient form
    document.getElementById("mobile-input").value = ''; // Clear the mobile input
    document.getElementById("patient-names-list").innerHTML = ''; // Clear the patient names list

    // Fill in date and time
    document.getElementById("dateTime").value = `${slot.date} ${slot.startTime}`; // Combine date and startTime
    document.getElementById("dateTime").readOnly = true; // Make dateTime readonly

    // Store the slot info in the modal for later use
    modal.dataset.slotInfo = JSON.stringify(slot); // Store slot info as a string
}

document.addEventListener("DOMContentLoaded", function() {
    // Close modal on close button click
    document.querySelector(".close").addEventListener("click", function() {
        document.getElementById("patient-search-modal").style.display = "none";
        document.body.classList.remove("modal-open");
    });
  
    // Search patients by mobile number
    document.getElementById("search-button").addEventListener("click", function() {
        const mobileNumber = document.getElementById("mobile-input").value;

        fetch(`http://localhost:8083/api/patients/search1?mobileNo=${mobileNumber}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const patientList = document.getElementById("patient-names-list");
                patientList.innerHTML = ""; // Clear previous results

                if (Array.isArray(data)) {
                    data.forEach(patient => {
                        const patientElement = document.createElement("div");
                        patientElement.textContent = patient.patientName;
                        patientElement.classList.add("patient-name");

                        patientElement.addEventListener("click", function() {
                            const modal = document.getElementById("patient-search-modal");
                            const slot = JSON.parse(modal.dataset.slotInfo); // Retrieve the slot info
                            populateForm(patient, slot); // Pass the patient and slot data
                        });

                        patientList.appendChild(patientElement);
                    });
                } else {
                    console.error("Unexpected response format:", data);
                }
            })
            .catch(error => {
                console.error("Error:", error);
                alert("An error occurred while fetching patient data. Please try again.");
            });
    });

    function populateForm(patient) {
        const modal = document.getElementById("patient-search-modal");
        const slot = JSON.parse(modal.dataset.slotInfo); // Retrieve the slot info
        
        document.getElementById("patientName").value = patient.patientName;
        document.getElementById("mobileNo").value = patient.mobileNo;
        document.getElementById("email").value = patient.email;
        document.getElementById("aadharNo").value = patient.aadharNo;
        document.getElementById("age").value = patient.age;
        if (slot) {
            const dateTimeValue = `${slot.date}T${slot.startTime}`; // Format as YYYY-MM-DDTHH:mm:ss
            document.getElementById("dateTime").value = dateTimeValue; 
            document.getElementById("dateTime").readOnly = true; // Make dateTime readonly
        }
    
        document.getElementById("address").value = patient.address;

       
    }
    
    document.getElementById("book-button").addEventListener("click", function() {
        const modal = document.getElementById("patient-search-modal");
        const slot = JSON.parse(modal.dataset.slotInfo); // Retrieve the slot info
        const doctor = JSON.parse(localStorage.getItem('doctor')); // Get doctor info from localStorage
    
        // Collect and trim form values
        const patientName = document.getElementById("patientName").value.trim();
        const mobileNo = document.getElementById("mobileNo").value.trim();
        const email = document.getElementById("email").value.trim();
        const aadharNo = document.getElementById("aadharNo").value.trim();
        const age = document.getElementById("age").value.trim();
        const dateTimeInput = document.getElementById("dateTime").value.trim();
        const address = document.getElementById("address").value.trim(); // Make sure to include address
    
        // Check if all required fields are filled
        if (!patientName || !mobileNo || !email || !aadharNo || !age || !dateTimeInput || !address) {
            alert("Please fill out all fields.");
            return; // Exit if any field is empty
        }
    
        // Convert dateTime to required format
        const dateTimeValue = new Date(dateTimeInput);
        const formattedDateTime = dateTimeValue.toISOString(); // This will give the format "YYYY-MM-DDTHH:MM:SS.sssZ"
        
        // Adjust to remove the milliseconds and 'Z' if necessary (assuming UTC)
        const trimmedDateTime = formattedDateTime.slice(0, 19); // "YYYY-MM-DDTHH:MM:SS"
    
        // Prepare form data
        const formData = {
            patientName,
            mobileNo,
            email,
            aadharNo,
            age,
            dateTime: trimmedDateTime, // Use the formatted dateTime
            address,
            roleId: 1, // Default roleId
            doctor: {
                userId: doctor.userId // Use the doctor userId from localStorage
            },
            slot: {
                slotId: slot.slotId // Use the slotId from the selected slot
            }
        };
    
        // Send booking request
        fetch("http://localhost:8083/api/patients", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.message || "Failed to book appointment");
                });
            }
            return response.json();
        })
        .then(data => {
            console.log("Booking Successful:", data);
            alert("Booking Successful");
    
            // Update slot status
            const slotId = slot.slotId; // Get the slot ID from the slot object
            const updateStatusUrl = `http://localhost:8082/api/slots/${slotId}?status=no`;
    
            return fetch(updateStatusUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                }
            });
        })
        .then(updateResponse => {
            if (!updateResponse.ok) {
                throw new Error("Failed to update slot status");
            }
            alert("Status updated. Please refresh the page.");
            document.getElementById("patient-search-modal").style.display = "none";
            document.body.classList.remove("modal-open");
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error occurred: " + error.message);
        });
    });
    
    
});


document.getElementById('create-slots-button').addEventListener('click', openCreateSlotsModal);

function openCreateSlotsModal() {
    document.getElementById('create-slots-modal').style.display = 'block';
}

function closeCreateSlotsModal() {
    document.getElementById('create-slots-modal').style.display = 'none';
}
document.getElementById('create-slot-button').addEventListener('click', createSlot);

function createSlot() {
    // Retrieve doctor data from local storage
    const doctorData = JSON.parse(localStorage.getItem('doctor'));
    const userId = doctorData ? doctorData.userId : null;

    // Gather form data
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const slotRange = document.getElementById('slotRange').value;
    const date = document.getElementById('date').value;

    // Prepare request body
    const requestBody = {
        startTime: startTime,
        endTime: endTime,
        slotRange: slotRange,
        userId: userId,
        date: date
    };

    // Make the API call
    fetch('http://localhost:8082/api/slots', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => response.json())
    .then(data => {
        alert('Slots created successfully');
        console.log(data); // Handle the response as needed
        closeCreateSlotsModal(); // Close the modal after creation
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to create slots');
    });
}


function openModifyAppointmentForm(slotData) {
    // Get the form element
    const form = document.getElementById("appointmentForm");

    // Change the header text to "Modify Appointment"
    const header = document.getElementById("formHeader");
    header.textContent = "Modify Appointment";

    // Remove the mobile number search field and search icon
    const mobileField = document.getElementById("mobileNumberField");
    if (mobileField) {
        mobileField.style.display = "none"; // Hide the field
    }
    const searchIcon = document.getElementById("searchIcon");
    if (searchIcon) {
        searchIcon.style.display = "none"; // Hide the search icon
    }

    // Set the form values to the existing slot data (like time, doctor, etc.)
    document.getElementById("dateField").value = slotData.date;
    document.getElementById("timeField").value = slotData.time;
    // Add more fields as needed...

    // Change the button label to "Modify"
    const submitButton = document.getElementById("submitButton");
    submitButton.textContent = "Modify";
    submitButton.onclick = function () {
        modifyAppointment(slotData);
    };

    // Blur the background when the form opens
    document.body.classList.add("blur-background");

    // Show the form
    form.style.display = "block";
}

let currentPatientId; // Variable to store the patient ID

function openModifyAppointmentForm(slot) {
    const slotId = slot.slotId;
    const modal = document.getElementById("patient-modify-modal");
    modal.style.display = "block";

    // Fetch patient data based on slotId
    fetch(`http://localhost:8083/api/patients/slot/${slotId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch patient data');
            }
            return response.json();
        })
        .then(patient => {
            currentPatientId = patient.patientId; // Store the patient ID

            // Get form field elements
            const fields = {
                patientName: document.getElementById("modify-patientName"),
                mobileNo: document.getElementById("modify-mobileNo"),
                email: document.getElementById("modify-email"),
                aadharNo: document.getElementById("modify-aadharNo"),
                age: document.getElementById("modify-age"),
                dateTime: document.getElementById("modify-dateTime"),
                address: document.getElementById("modify-address"),
            };

            // Populate the form fields
            fields.patientName.value = patient.patientName || '';
            fields.mobileNo.value = patient.mobileNo || '';
            fields.email.value = patient.email || '';
            fields.aadharNo.value = patient.aadharNo || '';
            fields.age.value = patient.age || '';
            fields.dateTime.value = patient.dateTime ? new Date(patient.dateTime).toLocaleString() : '';
            fields.address.value = patient.address || '';
        })
        .catch(error => {
            console.error("Error fetching patient data:", error);
        });
}



// Close the modal when the close button is clicked
document.querySelector(".close").addEventListener("click", function () {
    closeModal();
});

// Optional: Close modal on click outside
window.onclick = function(event) {
    const modal = document.getElementById("patient-modify-modal");
    if (event.target === modal) {
        closeModal();
    }
};


function closeCreateSlotsModall() {
    document.getElementById('patient-modify-modal').style.display = 'none';
}

document.getElementById("modify-button").addEventListener("click", function() {
    const patientData = {
        patientName: document.getElementById("modify-patientName").value,
        mobileNo: document.getElementById("modify-mobileNo").value,
        email: document.getElementById("modify-email").value,
        aadharNo: document.getElementById("modify-aadharNo").value,
        age: document.getElementById("modify-age").value,
        // Format the date here
        dateTime: formatDate(document.getElementById("modify-dateTime").value),
        address: document.getElementById("modify-address").value,
    };

    console.log("Modifying patient ID:", currentPatientId);
    console.log("Patient Data:", patientData);

    fetch(`http://localhost:8083/api/patients/${currentPatientId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(`Failed to modify patient details: ${err.message}`);
            });
        }
        return response.json();
    })
    .then(data => {
        alert("Patient details modified successfully!");
        document.getElementById("patient-modify-modal").style.display = "none";
    })
    .catch(error => {
        console.error("Error modifying patient details:", error);
    });
});

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 19); // Get YYYY-MM-DDTHH:mm:ss
}
