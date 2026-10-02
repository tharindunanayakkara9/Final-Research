import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Package,
  Snowflake,
  Truck,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const CONTAINER_TYPES = [
  { value: 'standard', label: 'Standard', icon: Package, baseMinutes: 12 },
  { value: 'reefer', label: 'Reefer', icon: Snowflake, baseMinutes: 25 },
  { value: 'hazardous', label: 'Hazardous', icon: AlertTriangle, baseMinutes: 43 },
  { value: 'oversized', label: 'Oversized', icon: Truck, baseMinutes: 19 },
]

const CARRIERS = ['Carrier-A', 'Carrier-B', 'Carrier-C', 'Carrier-D', 'Carrier-E', 'Carrier-F']

const LANE_COUNT = 6

function tomorrowDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

// Simulated lane/time assignment — the real assignment (MIP optimizer + ML
// clearance/congestion models) runs server-side; this stands in until that
// backend is wired up so the flow can be demoed end-to-end.
function assignGateSlot({ containerType, cargoCategory }) {
  const laneQueues = Array.from({ length: LANE_COUNT }, () => Math.floor(Math.random() * 8))
  let bestLane = 1
  for (let lane = 2; lane <= LANE_COUNT; lane++) {
    if (laneQueues[lane - 1] < laneQueues[bestLane - 1]) bestLane = lane
  }

  const typeInfo = CONTAINER_TYPES.find((t) => t.value === containerType) ?? CONTAINER_TYPES[0]
  const predictedMinutes = Math.round(typeInfo.baseMinutes + (Math.random() * 6 - 3))

  const slotOffsetMinutes = 20 + laneQueues[bestLane - 1] * 12
  const slotStart = new Date()
  slotStart.setMinutes(slotStart.getMinutes() + slotOffsetMinutes, 0, 0)
  const slotEnd = new Date(slotStart.getTime() + predictedMinutes * 60000)

  const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return {
    lane: bestLane,
    laneQueue: laneQueues[bestLane - 1],
    timeLabel: `${fmt(slotStart)} - ${fmt(slotEnd)}`,
    predictedMinutes,
    cargoCategory,
    containerType: typeInfo.label,
  }
}

export default function GateAppointment() {
  const [form, setForm] = useState({
    truckId: '',
    containerId: '',
    carrier: CARRIERS[0],
    cargoCategory: 'export',
    containerType: 'standard',
    preferredDate: tomorrowDate(),
  })
  const [status, setStatus] = useState('idle') // idle | assigning | assigned
  const [assignment, setAssignment] = useState(null)

  const updateField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setStatus('assigning')
    setTimeout(() => {
      setAssignment(assignGateSlot(form))
      setStatus('assigned')
    }, 900)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[#123a5c]">Request a Gate Appointment</h1>
      <p className="mt-1 text-sm text-gray-600">
        Submit your container details and the system will assign the gate lane and
        arrival time slot with the shortest expected wait.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid gap-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2"
      >
        <div className="sm:col-span-1">
          <label htmlFor="truckId" className="block text-sm font-medium text-gray-700">
            Truck ID
          </label>
          <input
            id="truckId"
            required
            value={form.truckId}
            onChange={updateField('truckId')}
            placeholder="TRK-80579"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#123a5c] focus:ring-1 focus:ring-[#123a5c]"
          />
        </div>

        <div className="sm:col-span-1">
          <label htmlFor="containerId" className="block text-sm font-medium text-gray-700">
            Container ID
          </label>
          <input
            id="containerId"
            required
            value={form.containerId}
            onChange={updateField('containerId')}
            placeholder="MAEU3483419"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#123a5c] focus:ring-1 focus:ring-[#123a5c]"
          />
        </div>

        <div className="sm:col-span-1">
          <label htmlFor="carrier" className="block text-sm font-medium text-gray-700">
            Carrier Company
          </label>
          <select
            id="carrier"
            value={form.carrier}
            onChange={updateField('carrier')}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#123a5c] focus:ring-1 focus:ring-[#123a5c]"
          >
            {CARRIERS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-1">
          <label htmlFor="cargoCategory" className="block text-sm font-medium text-gray-700">
            Cargo Category
          </label>
          <select
            id="cargoCategory"
            value={form.cargoCategory}
            onChange={updateField('cargoCategory')}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#123a5c] focus:ring-1 focus:ring-[#123a5c]"
          >
            <option value="export">Export</option>
            <option value="import">Import</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <span className="block text-sm font-medium text-gray-700">Container Type</span>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CONTAINER_TYPES.map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm transition-colors ${
                  form.containerType === value
                    ? 'border-[#123a5c] bg-[#123a5c]/5 text-[#123a5c]'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="containerType"
                  value={value}
                  checked={form.containerType === value}
                  onChange={updateField('containerType')}
                  className="sr-only"
                />
                <Icon className="h-5 w-5" />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="preferredDate" className="block text-sm font-medium text-gray-700">
            Preferred Date
          </label>
          <input
            id="preferredDate"
            type="date"
            value={form.preferredDate}
            onChange={updateField('preferredDate')}
            min={tomorrowDate()}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#123a5c] focus:ring-1 focus:ring-[#123a5c] sm:w-56"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={status === 'assigning'}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#123a5c] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0e2d47] disabled:opacity-70 sm:w-auto"
          >
            {status === 'assigning' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Assigning gate & time slot...
              </>
            ) : (
              'Request Appointment'
            )}
          </button>
        </div>
      </form>

      {status === 'assigned' && assignment && (
        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Appointment Confirmed
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#123a5c]">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-gray-500">Gate Lane</p>
                <p className="text-lg font-bold text-[#123a5c]">Gate {assignment.lane}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#123a5c]">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-gray-500">Arrival Window</p>
                <p className="text-lg font-bold text-[#123a5c]">{assignment.timeLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#123a5c]">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-gray-500">Predicted Clearance</p>
                <p className="text-lg font-bold text-[#123a5c]">~{assignment.predictedMinutes} min</p>
              </div>
            </div>
          </div>

          <ul className="mt-5 list-disc space-y-1 pl-5 text-sm text-gray-700">
            <li>
              Gate {assignment.lane} had the shortest current queue ({assignment.laneQueue} trucks
              ahead) among all 6 lanes.
            </li>
            <li>
              {assignment.containerType} / {assignment.cargoCategory} cargo — predicted clearance
              time based on similar past trucks.
            </li>
            <li>Pre-clear your documents before arrival to avoid delays at the gate.</li>
          </ul>

          <Link
            to="/document-upload"
            state={{
              containerId: form.containerId,
              truckId: form.truckId,
              containerType: form.containerType,
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#123a5c] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0e2d47]"
          >
            Continue to Document Upload
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
