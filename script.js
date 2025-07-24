let map;
let markersLayer = L.layerGroup();
let customers = [];

document.getElementById("fileInput").addEventListener("change", handleFile);
document.getElementById("filterNoGPS").addEventListener("click", toggleNoGPS);
document.getElementById("locateMe").addEventListener("click", locateUser);

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const lines = e.target.result.split("\n").filter(line => line.trim() !== "");
    customers = lines.map(line => {
      const parts = line.split("\t");
      return {
        tournee: parts[0] || "",
        code: parts[1] || "",
        name: parts[2] || "",
        address: parts[3] || "",
        compteur: parts[4] || "",
        lng: parts[5] || "",
        lat: parts[6] || ""
      };
    });
    displayCustomers(customers);
    updateMap(customers);
  };
  reader.readAsText(file);
}

function displayCustomers(data) {
  const tableBody = document.querySelector("#customerTable tbody");
  tableBody.innerHTML = "";

  data.forEach(c => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${c.tournee}</td>
      <td>${c.code}</td>
      <td>${c.name}</td>
      <td>${c.address}</td>
      <td>${c.compteur}</td>
      <td>${c.lat}</td>
      <td>${c.lng}</td>
    `;
    // Highlight customers without GPS
    if (!c.lat || !c.lng) {
      row.style.backgroundColor = "#ffdddd";
    }
    tableBody.appendChild(row);
  });
}

function updateMap(data) {
  markersLayer.clearLayers();
  data.forEach(c => {
    if (c.lat && c.lng) {
      const marker = L.marker([c.lat, c.lng]).bindPopup(`
        <strong>${c.name}</strong><br>${c.address}<br>🧾 ${c.compteur}
      `);
      markersLayer.addLayer(marker);
    }
  });
}

function toggleNoGPS() {
  const showOnlyNoGPS = document.getElementById("filterNoGPS").classList.toggle("active");
  const filtered = showOnlyNoGPS
    ? customers.filter(c => !c.lat || !c.lng)
    : customers;
  displayCustomers(filtered);
  updateMap(filtered);
}

function locateUser() {
  if (!navigator.geolocation) {
    alert("⚠️ المتصفح لا يدعم تحديد الموقع.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      map.setView([lat, lng], 18);
      L.marker([lat, lng], { icon: L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      })})
        .addTo(map)
        .bindPopup("📍 موقعك الحالي")
        .openPopup();
    },
    err => {
      alert("⚠️ تعذر تحديد موقعك.");
      console.error(err);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

window.onload = () => {
  map = L.map("map").setView([36.1667, 1.3333], 13); // موقع الشلف مركز

  const satelliteLayer = L.tileLayer(
    "https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    {
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: "© Google"
    }
  );
  satelliteLayer.addTo(map);
  markersLayer.addTo(map);
};
