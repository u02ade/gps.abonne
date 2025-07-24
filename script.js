let data = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 10;
let showOnlyNoGPS = false;
let map, markers = [];

document.getElementById('fileInput').addEventListener('change', handleFile);
document.getElementById('searchInput').addEventListener('input', handleSearch);
document.getElementById('toggleNoGPS').addEventListener('click', toggleNoGPS);
document.getElementById('exportBtn').addEventListener('click', exportToExcel);
document.getElementById('locateMeBtn').addEventListener('click', locateUser);

function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const lines = event.target.result.split('\n').map(line => line.trim()).filter(line => line);
    data = lines.map(line => {
      const parts = line.split('\t');
      return {
        tournee: parts[0] || '',
        numab: parts[1] || '',
        raisoc: parts[2] || '',
        adresse: parts[3] || '',
        numser: parts[4] || '',
        gps_x: parts[5] || '',
        gps_y: parts[6] || ''
      };
    });
    filteredData = [...data];
    updateTable();
    updateMap();
  };
  reader.readAsText(file);
}

function updateTable() {
  const tbody = document.querySelector('#dataTable tbody');
  tbody.innerHTML = '';

  const totalCount = filteredData.length;
  const gpsCount = filteredData.filter(r => r.gps_x && r.gps_y).length;
  document.getElementById('totalCount').textContent = totalCount;
  document.getElementById('gpsCount').textContent = gpsCount;

  const start = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(start, start + rowsPerPage);

  paginatedData.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.tournee}</td>
      <td>${row.numab}</td>
      <td>${row.raisoc}</td>
      <td>${row.adresse}</td>
      <td>${row.numser}</td>
      <td>${row.gps_x}</td>
      <td>${row.gps_y}</td>
    `;
    tbody.appendChild(tr);
  });

  updatePagination();
}

function updatePagination() {
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';

  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement('li');
    li.className = 'page-item' + (i === currentPage ? ' active' : '');
    const btn = document.createElement('button');
    btn.className = 'page-link';
    btn.textContent = i;
    btn.onclick = () => {
      currentPage = i;
      updateTable();
    };
    li.appendChild(btn);
    pagination.appendChild(li);
  }
}

function handleSearch() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  filteredData = data.filter(row =>
    row.tournee.toLowerCase().includes(query) ||
    row.numab.toLowerCase().includes(query) ||
    row.raisoc.toLowerCase().includes(query) ||
    row.adresse.toLowerCase().includes(query) ||
    row.numser.toLowerCase().includes(query)
  );
  if (showOnlyNoGPS) {
    filteredData = filteredData.filter(r => !r.gps_x || !r.gps_y);
  }
  currentPage = 1;
  updateTable();
  updateMap();
}

function toggleNoGPS() {
  showOnlyNoGPS = !showOnlyNoGPS;
  handleSearch();
}

function exportToExcel() {
  const ws = XLSX.utils.json_to_sheet(filteredData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clients");
  XLSX.writeFile(wb, "clients.xlsx");
}

function locateUser() {
  if (!navigator.geolocation) {
    alert('المتصفح لا يدعم تحديد الموقع');
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    L.marker([lat, lon], { title: "موقعي الحالي", icon: L.icon({
      iconUrl: 'https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    }) }).addTo(map).bindPopup("📍 موقعي الحالي").openPopup();
    map.setView([lat, lon], 15);
  }, err => {
    alert("تعذر تحديد الموقع: " + err.message);
  });
}

function updateMap() {
  if (!map) {
    map = L.map('map').setView([36.167, 1.334], 13); // مركز مدينة الشلف
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, etc.',
    maxZoom: 19
}).addTo(map);

  }

  markers.forEach(marker => map.removeLayer(marker));
  markers = [];

  filteredData.forEach(row => {
    if (row.gps_x && row.gps_y) {
      const marker = L.marker([parseFloat(row.gps_x), parseFloat(row.gps_y)]).addTo(map)
        .bindPopup(`<strong>${row.raisoc}</strong><br>${row.adresse}<br>${row.numab}`);
      markers.push(marker);
    }
  });
}
