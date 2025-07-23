let data = [];
let map, marker;
let currentPage = 1;
const rowsPerPage = 10;

function renderTable() {
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";
  const start = (currentPage - 1) * rowsPerPage;
  const pageData = data.slice(start, start + rowsPerPage);

  pageData.forEach((row, index) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });

    if (row[5] && row[6]) {
      tr.classList.add("has-gps");
    }

    tr.addEventListener("click", () => {
      document.querySelectorAll("#dataTable tbody tr").forEach((r) =>
        r.classList.remove("selected-row")
      );
      tr.classList.add("selected-row");

      if (row[5] && row[6]) {
        const lat = parseFloat(row[5]);
        const lng = parseFloat(row[6]);
        map.setView([lat, lng], 17);
        if (marker) marker.remove();
        marker = L.marker([lat, lng]).addTo(map);
      }
    });

    tbody.appendChild(tr);
  });

  document.getElementById("totalCount").textContent = data.length;
  document.getElementById("gpsCount").textContent = data.filter((r) => r[5] && r[6]).length;

  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement("li");
    li.className = "page-item" + (i === currentPage ? " active" : "");
    const a = document.createElement("a");
    a.className = "page-link";
    a.textContent = i;
    a.href = "#";
    a.addEventListener("click", (e) => {
      e.preventDefault();
      currentPage = i;
      renderTable();
    });
    li.appendChild(a);
    pagination.appendChild(li);
  }
}

function filterData(keyword) {
  currentPage = 1;
  const lower = keyword.toLowerCase();
  data = originalData.filter((row) =>
    row.some((cell) => cell.toLowerCase().includes(lower))
  );
  renderTable();
}

const searchInput = document.getElementById("searchInput");
searchInput.addEventListener("input", (e) => {
  filterData(e.target.value);
});

let originalData = [];
document.getElementById("fileInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const text = event.target.result;
    const lines = text.trim().split("\n");

    originalData = lines.map((line) => {
      const parts = line.split("\t").slice(0, 7);
      while (parts.length < 7) parts.push("");
      return parts;
    });
    data = [...originalData];
    currentPage = 1;
    renderTable();
  };
  reader.readAsText(file);
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clients");
  XLSX.writeFile(wb, "clients.xlsx");
});

// 🗺️ إعداد الخريطة
map = L.map("map").setView([36.165, 1.334], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: 'Map data © OpenStreetMap contributors'
}).addTo(map);

// 📍 إدخال GPS بالنقر على الخريطة
map.on("click", (e) => {
  const selected = document.querySelector("tr.selected-row");
  if (!selected) return;
  const index = [...selected.parentNode.children].indexOf(selected) + (currentPage - 1) * rowsPerPage;
  data[index][5] = e.latlng.lat.toFixed(6);
  data[index][6] = e.latlng.lng.toFixed(6);
  renderTable();
});

// 🧭 زر تحديد موقعي الحالي
document.getElementById("locateMeBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("المتصفح لا يدعم تحديد الموقع الجغرافي.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      if (marker) marker.remove();
      marker = L.marker([lat, lng]).addTo(map).bindPopup("📍 موقعك الحالي").openPopup();
      map.setView([lat, lng], 16);
    },
    (error) => {
      alert("فشل في تحديد الموقع: " + error.message);
    }
  );
});
