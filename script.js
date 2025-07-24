let allData = [];
let currentPage = 1;
const rowsPerPage = 10; // ← تم تقليل عدد الأسطر لكل صفحة هنا

const map = L.map('map').setView([36.1679, 1.3346], 13);

// 🛰️ خريطة الأقمار الصناعية (ESRI)
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: '© ESRI',
  maxZoom: 20
}).addTo(map);

const markersLayer = L.layerGroup().addTo(map);

document.getElementById('fileInput').addEventListener('change', handleFile);
document.getElementById('searchInput').addEventListener('input', renderTable);
document.getElementById('exportBtn').addEventListener('click', exportToExcel);
document.getElementById('locateMeBtn').addEventListener('click', locateMe);

const checkbox = document.createElement('input');
checkbox.type = 'checkbox';
checkbox.id = 'noGpsOnly';
checkbox.classList.add('form-check-input', 'ms-2');
checkbox.addEventListener('change', renderTable);

const label = document.createElement('label');
label.htmlFor = 'noGpsOnly';
label.classList.add('form-check-label');
label.textContent = '📌 عرض فقط الزبائن بدون GPS';

const container = document.createElement('div');
container.classList.add('form-check', 'form-switch', 'mb-3');
container.appendChild(checkbox);
container.appendChild(label);
document.querySelector('body').insertBefore(container, document.getElementById('dataTable'));

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const lines = e.target.result.split('\n').filter(line => line.trim() !== '');
    allData = lines.map(line => {
      const [TOURNEE, NUMAB, RAISOC, ADRESSE, NUMSER, GPS_X, GPS_Y] = line.split('\t');
      return { TOURNEE, NUMAB, RAISOC, ADRESSE, NUMSER, GPS_X, GPS_Y };
    }).filter(row => Object.values(row).some(cell => cell && cell.trim() !== ''));
    currentPage = 1;
    renderTable();
  };
  reader.readAsText(file);
}

function renderTable() {
  const searchValue = document.getElementById('searchInput').value.trim().toLowerCase();
  const showNoGpsOnly = document.getElementById('noGpsOnly').checked;

  const filteredData = allData.filter(row => {
    const matchesSearch = Object.values(row).some(val =>
      val && val.toLowerCase().includes(searchValue)
    );
    const hasGPS = row.GPS_X && row.GPS_Y && !isNaN(row.GPS_X) && !isNaN(row.GPS_Y);
    return matchesSearch && (!showNoGpsOnly || !hasGPS);
  });

  const tableBody = document.querySelector('#dataTable tbody');
  tableBody.innerHTML = '';

  const totalCount = filteredData.length;
  const gpsCount = filteredData.filter(row => row.GPS_X && row.GPS_Y && !isNaN(row.GPS_X) && !isNaN(row.GPS_Y)).length;

  document.getElementById('totalCount').textContent = totalCount;
  document.getElementById('gpsCount').textContent = gpsCount;

  const start = (currentPage - 1) * rowsPerPage;
  const paginatedData = filteredData.slice(start, start + rowsPerPage);

  paginatedData.forEach(row => {
    const tr = document.createElement('tr');
    if (!row.GPS_X || !row.GPS_Y || isNaN(row.GPS_X) || isNaN(row.GPS_Y)) {
      tr.classList.add('table-warning');
    }
    tr.innerHTML = `
      <td>${row.TOURNEE || ''}</td>
      <td>${row.NUMAB || ''}</td>
      <td>${row.RAISOC || ''}</td>
      <td>${row.ADRESSE || ''}</td>
      <td>${row.NUMSER || ''}</td>
      <td>${row.GPS_X || ''}</td>
      <td>${row.GPS_Y || ''}</td>
    `;
    tableBody.appendChild(tr);
  });

  renderPagination(filteredData.length);
  updateMapMarkers(paginatedData);
}

function renderPagination(totalRows) {
  const pageCount = Math.ceil(totalRows / rowsPerPage);
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';

  for (let i = 1; i <= pageCount; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === currentPage ? 'active' : ''}`;
    li.innerHTML = `<button class="page-link">${i}</button>`;
    li.addEventListener('click', () => {
      currentPage = i;
      renderTable();
    });
    pagination.appendChild(li);
  }
}

function updateMapMarkers(data) {
  markersLayer.clearLayers();
  data.forEach(row => {
    const lat = parseFloat(row.GPS_Y);
    const lng = parseFloat(row.GPS_X);
    if (!isNaN(lat) && !isNaN(lng)) {
      const marker = L.marker([lat, lng]).addTo(markersLayer);
      marker.bindPopup(`<strong>${row.RAISOC || ''}</strong><br>${row.ADRESSE || ''}<br>📍 ${lat}, ${lng}`);
    }
  });

  const validPoints = data
    .map(row => {
      const lat = parseFloat(row.GPS_Y);
      const lng = parseFloat(row.GPS_X);
      return (!isNaN(lat) && !isNaN(lng)) ? [lat, lng] : null;
    })
    .filter(point => point !== null);

  if (validPoints.length > 0) {
    const bounds = L.latLngBounds(validPoints);
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

function exportToExcel() {
  const table = document.getElementById('dataTable');
  const wb = XLSX.utils.table_to_book(table, { sheet: "زبائن" });
  XLSX.writeFile(wb, 'الزبائن.xlsx');
}

function locateMe() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        const userMarker = L.marker([latitude, longitude], {
          icon: L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/61/61168.png',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          })
        }).addTo(map);
        userMarker.bindPopup("📍 موقعك الحالي").openPopup();
        map.setView([latitude, longitude], 15);
      },
      () => alert("❌ فشل في تحديد الموقع.")
    );
  } else {
    alert("❌ المتصفح لا يدعم تحديد الموقع.");
  }
}
