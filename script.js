let allData = [];
let currentPage = 1;
const rowsPerPage = 10;
let map, markersLayer;

document.getElementById("fileInput").addEventListener("change", handleFile);
document.getElementById("searchInput").addEventListener("input", renderTable);
document.getElementById("exportBtn").addEventListener("click", exportToExcel);
document.getElementById("locateMeBtn").addEventListener("click", locateMe);

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const lines = e.target.result.split("\n");
    allData = [];

    for (let line of lines) {
      const parts = line.trim().split("\t");
      if (parts.length < 5) continue;

      // اكمل الأعمدة إن كانت ناقصة (GPS_X و GPS_Y)
      while (parts.length < 7) parts.push("");

      const [TOURNEE, NUMAB, RAISOC, ADRESSE, NUMSER, GPS_X, GPS_Y] = parts;
      if (TOURNEE || NUMAB || RAISOC || ADRESSE || NUMSER)
        allData.push({ TOURNEE, NUMAB, RAISOC, ADRESSE, NUMSER, GPS_X, GPS_Y });
    }

    currentPage = 1;
    renderTable();
    renderMap();
  };

  reader.readAsText(file);
}

function renderTable() {
  const searchValue = document.getElementById("searchInput").value.trim();
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";

  const filtered = allData.filter((row) => {
    const combined = `${row.NUMAB} ${row.RAISOC} ${row.NUMSER} ${row.ADRESSE}`;
    return combined.includes(searchValue);
  });

  const total = filtered.length;
  const gpsCount = filtered.filter((r) => r.GPS_X && r.GPS_Y).length;

  document.getElementById("totalCount").textContent = total;
  document.getElementById("gpsCount").textContent = gpsCount;

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = filtered.slice(start, end);

  for (let row of pageData) {
    const tr = document.createElement("tr");

    // لون خاص لمن ليس لديهم GPS
    if (!row.GPS_X || !row.GPS_Y) {
      tr.classList.add("table-warning");
    }

    ["TOURNEE", "NUMAB", "RAISOC", "ADRESSE", "NUMSER", "GPS_X", "GPS_Y"].forEach((key) => {
      const td = document.createElement("td");
      td.textContent = row[key];
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  }

  renderPagination(filtered.length);
}

function renderPagination(totalRows) {
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement("li");
    li.className = "page-item" + (i === currentPage ? " active" : "");
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener("click", (e) => {
      e.preventDefault();
      currentPage = i;
      renderTable();
    });
    pagination.appendChild(li);
  }
}

function exportToExcel() {
  const ws = XLSX.utils.json_to_sheet(allData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clients");
  XLSX.writeFile(wb, "clients.xlsx");
}

function renderMap() {
  if (!map) {
    map = L.map("map").setView([36.1653, 1.3340], 13); // الشلف مركز
    L.tileLayer("https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      maxZoom: 20,
    }).addTo(map);
  }

  if (markersLayer) {
    markersLayer.clearLayers();
  } else {
    markersLayer = L.layerGroup().addTo(map);
  }

  allData.forEach((row) => {
    if (row.GPS_X && row.GPS_Y) {
      const marker = L.marker([parseFloat(row.GPS_Y), parseFloat(row.GPS_X)]);
      marker.bindPopup(`<strong>${row.RAISOC}</strong><br>${row.ADRESSE}`);
      markersLayer.addLayer(marker);
    }
  });
}

function locateMe() {
  if (!navigator.geolocation) return alert("الموقع غير مدعوم");

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      map.setView([lat, lng], 18);
      L.marker([lat, lng]).addTo(map).bindPopup("📍 موقعي الحالي").openPopup();
    },
    () => alert("تعذر تحديد الموقع")
  );
}
