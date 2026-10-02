const API_BASE_URL = 'http://localhost:8000'

async function postJson(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${path} failed with ${res.status}`)
  return res.json()
}

async function getJson(path) {
  const res = await fetch(`${API_BASE_URL}${path}`)
  if (!res.ok) throw new Error(`${path} failed with ${res.status}`)
  return res.json()
}

export function requestAppointment({ truckId, containerId, carrier, cargoCategory, containerType }) {
  return postJson('/api/assign-appointment', {
    truck_id: truckId,
    container_id: containerId,
    carrier,
    cargo_category: cargoCategory,
    container_type: containerType,
  })
}

export function getCongestion() {
  return getJson('/api/congestion')
}
