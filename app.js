const STORAGE_KEY = 'roteirizador-entregas-v1';
const basePoint = { lat: -23.5505, lng: -46.6333 };

const deliveryForm = document.getElementById('deliveryForm');
const routeList = document.getElementById('routeList');
const deliveryList = document.getElementById('deliveryList');
const optimizeBtn = document.getElementById('optimizeBtn');
const resetDataBtn = document.getElementById('resetDataBtn');

const totalStopsEl = document.getElementById('totalStops');
const totalDistanceEl = document.getElementById('totalDistance');
const totalTimeEl = document.getElementById('totalTime');

let deliveries = loadData();

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    return [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deliveries));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function calculateRoute(items) {
  if (!items.length) return [];

  const remaining = [...items];
  const ordered = [];
  let currentPoint = basePoint;

  while (remaining.length) {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    remaining.forEach((item, index) => {
      const distance = haversineKm(
        currentPoint.lat,
        currentPoint.lng,
        item.lat,
        item.lng
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const chosen = remaining.splice(nearestIndex, 1)[0];
    ordered.push({
      ...chosen,
      distanceFromCurrent: nearestDistance,
    });

    currentPoint = { lat: chosen.lat, lng: chosen.lng };
  }

  return ordered;
}

function updateSummary(items) {
  const totalStops = items.length;
  let totalDistance = 0;
  let totalMinutes = 0;

  items.forEach((item) => {
    totalDistance += Number(item.distanceFromCurrent || 0);
    totalMinutes += Number(item.duration || 0);
  });

  totalStopsEl.textContent = String(totalStops);
  totalDistanceEl.textContent = `${totalDistance.toFixed(1)} km`;
  totalTimeEl.textContent = `${Math.round(totalMinutes)} min`;
}

function renderRouteList() {
  const ordered = calculateRoute(deliveries);

  if (!ordered.length) {
    routeList.innerHTML = '<li class="empty-state">A rota aparecerá aqui após você cadastrar entregas.</li>';
    updateSummary([]);
    return;
  }

  routeList.innerHTML = ordered
    .map(
      (delivery, index) => `
        <li class="route-item">
          <div class="route-order">${index + 1}</div>
          <div class="route-main">
            <div class="route-name">${delivery.name}</div>
            <div class="route-meta">${delivery.address}</div>
          </div>
          <span class="priority-badge">${delivery.priority}</span>
        </li>
      `
    )
    .join('');

  updateSummary(ordered);
}

function renderDeliveryList() {
  if (!deliveries.length) {
    deliveryList.innerHTML = '<li class="empty-state">Nenhuma entrega cadastrada.</li>';
    return;
  }

  deliveryList.innerHTML = deliveries
    .map(
      (delivery, index) => `
        <li class="delivery-item">
          <div class="delivery-main">
            <div class="delivery-name">${delivery.name}</div>
            <div class="delivery-meta">${delivery.address} • ${delivery.duration} min</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="priority-badge">${delivery.priority}</span>
            <button class="delete-btn" data-index="${index}" type="button">Excluir</button>
          </div>
        </li>
      `
    )
    .join('');
}

function renderAll() {
  renderRouteList();
  renderDeliveryList();
}

deliveryForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.getElementById('clientName').value.trim();
  const address = document.getElementById('address').value.trim();
  const lat = Number(document.getElementById('latitude').value);
  const lng = Number(document.getElementById('longitude').value);
  const duration = Number(document.getElementById('duration').value);
  const priority = document.getElementById('priority').value;

  if (!name || !address || Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(duration)) {
    alert('Preencha todos os campos corretamente antes de salvar.');
    return;
  }

  deliveries.push({ name, address, lat, lng, duration, priority });
  saveData();
  deliveryForm.reset();

  document.getElementById('latitude').value = '-23.5505';
  document.getElementById('longitude').value = '-46.6333';
  document.getElementById('duration').value = '20';
  document.getElementById('priority').value = 'Média';

  renderAll();
});

optimizeBtn.addEventListener('click', () => {
  if (!deliveries.length) {
    alert('Adicione pelo menos uma entrega antes de organizar a rota.');
    return;
  }

  renderRouteList();
});

deliveryList.addEventListener('click', (event) => {
  const button = event.target.closest('.delete-btn');
  if (!button) return;

  const index = Number(button.dataset.index);
  if (Number.isNaN(index)) return;

  deliveries.splice(index, 1);
  saveData();
  renderAll();
});

resetDataBtn.addEventListener('click', () => {
  const confirmed = window.confirm('Deseja limpar todas as entregas registradas?');
  if (!confirmed) return;

  deliveries = [];
  saveData();
  renderAll();
});

renderAll();
