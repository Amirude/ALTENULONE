// Matches the 5 Phase 1 categories seeded in the backend's service_categories table.
// The "fields" here become the keys of the JSON blob the backend stores in Booking.detailsJson —
// keep the field ids in sync with what a developer expects to read back out.
export const CATEGORIES = [
  {
    code: 'xerox', icon: '📠', name: 'Xerox / Printout', desc: 'Upload, pay, pick up ready',
    fields: [
      { id: 'copies', label: 'Copies / pages', type: 'text' },
      { id: 'color', label: 'Print type', type: 'select', options: ['Black & white', 'Color'] },
      { id: 'binding', label: 'Binding', type: 'select', options: ['None', 'Stapled', 'Spiral bound'] },
      { id: 'mode', label: 'Pickup or delivery', type: 'select', options: ['I will pick up', 'Deliver to my address'] },
      { id: 'address', label: 'Address (if delivery)', type: 'text' },
    ],
  },
  {
    code: 'ac', icon: '❄️', name: 'AC Service', desc: 'Install, repair, gas top-up',
    fields: [
      { id: 'work', label: 'Service type', type: 'select', options: ['Regular service', 'Gas refill', 'Repair', 'New installation'] },
      { id: 'address', label: 'Address', type: 'text' },
      { id: 'date', label: 'Date', type: 'date' },
      { id: 'time', label: 'Time slot', type: 'time' },
    ],
  },
  {
    code: 'plumber', icon: '🔧', name: 'Plumber', desc: 'Leaks, fittings, blockages',
    fields: [
      { id: 'issue', label: 'Issue', type: 'select', options: ['Leak', 'Blocked drain', 'Tap / fitting', 'New pipeline', 'Other'] },
      { id: 'urgency', label: 'Urgency', type: 'select', options: ['Urgent — today', 'Within 2-3 days', 'Whenever convenient'] },
      { id: 'address', label: 'Address', type: 'text' },
      { id: 'date', label: 'Preferred date', type: 'date' },
      { id: 'time', label: 'Preferred time', type: 'time' },
    ],
  },
  {
    code: 'electrician', icon: '💡', name: 'Electrician', desc: 'Wiring, switches, fittings',
    fields: [
      { id: 'issue', label: 'Issue', type: 'select', options: ['Wiring problem', 'Switch/socket repair', 'New fitting installation', 'Fan/light issue', 'Other'] },
      { id: 'urgency', label: 'Urgency', type: 'select', options: ['Urgent — today', 'Within 2-3 days', 'Whenever convenient'] },
      { id: 'address', label: 'Address', type: 'text' },
      { id: 'date', label: 'Preferred date', type: 'date' },
      { id: 'time', label: 'Preferred time', type: 'time' },
    ],
  },
  {
    code: 'parcel', icon: '📦', name: 'Parcel Pickup & Delivery', desc: 'Send something across town',
    fields: [
      { id: 'pickupAddress', label: 'Pickup address', type: 'text' },
      { id: 'dropAddress', label: 'Drop address', type: 'text' },
      { id: 'itemDescription', label: 'What are you sending', type: 'text' },
      { id: 'date', label: 'Date', type: 'date' },
      { id: 'time', label: 'Preferred pickup time', type: 'time' },
    ],
  },
  {
    code: 'rental', icon: '🚐', name: 'Bike/Car Rental', desc: 'By the day', 
    fields: [
      { id: 'vehicleType', label: 'Vehicle type', type: 'select', options: ['Bike', 'Car (hatchback)', 'Car (sedan/SUV)', 'Van'] },
      { id: 'pickupLocation', label: 'Pickup location', type: 'text' },
      { id: 'pickupDate', label: 'Pickup date', type: 'date' },
      { id: 'returnDate', label: 'Return date', type: 'date' },
    ],
  },
  {
    code: 'driver', icon: '🚗', name: 'Driver Booking', desc: 'A driver for your own vehicle',
    fields: [
      { id: 'tripType', label: 'Trip type', type: 'select', options: ['One-way', 'Round trip', 'Monthly / long-term'] },
      { id: 'pickupLocation', label: 'Pickup location', type: 'text' },
      { id: 'dropLocation', label: 'Drop location', type: 'text' },
      { id: 'date', label: 'Date', type: 'date' },
      { id: 'time', label: 'Time', type: 'time' },
    ],
  },
  {
    code: 'houserent', icon: '🏠', name: 'House Rent / Lease', desc: 'Post what you need',
    fields: [
      { id: 'propertyType', label: 'Looking for', type: 'select', options: ['1 BHK', '2 BHK', '3 BHK', 'Independent house', 'Commercial space'] },
      { id: 'area', label: 'Preferred area', type: 'text' },
      { id: 'budget', label: 'Monthly budget (₹)', type: 'text' },
      { id: 'contact', label: 'Contact number', type: 'text' },
    ],
  },
  {
    code: 'hotel', icon: '🛏️', name: 'Hotel Booking', desc: 'For a night or a week',
    fields: [
      { id: 'city', label: 'City', type: 'text' },
      { id: 'checkin', label: 'Check-in', type: 'date' },
      { id: 'checkout', label: 'Check-out', type: 'date' },
      { id: 'guests', label: 'Guests', type: 'text' },
    ],
  },
  {
    code: 'scrap', icon: '♻️', name: 'Scrap Collection', desc: 'Sell your old paper, metal, plastic',
    fields: [
      { id: 'items', label: 'What are you selling', type: 'text' },
      { id: 'estimatedWeight', label: 'Approx. weight (kg)', type: 'text' },
      { id: 'address', label: 'Pickup address', type: 'text' },
      { id: 'date', label: 'Preferred pickup date', type: 'date' },
    ],
  },
  {
    code: 'fooddonation', icon: '🍛', name: 'Food Donation', desc: 'Route a spare meal to someone who needs it',
    fields: [
      { id: 'recipient', label: 'Who is this for', type: 'select', options: ['An elderly person', 'A person with a disability', 'A widow in need', 'A family I know'] },
      { id: 'quantity', label: 'Meals / quantity', type: 'text' },
      { id: 'address', label: 'Address', type: 'text' },
      { id: 'date', label: 'Starting date', type: 'date' },
    ],
  },
  {
    code: 'oldclothes', icon: '👕', name: 'Old Clothes Donation', desc: 'Pickup for a trust nearby',
    fields: [
      { id: 'quantity', label: 'Approx. quantity', type: 'text' },
      { id: 'address', label: 'Pickup address', type: 'text' },
      { id: 'date', label: 'Preferred pickup date', type: 'date' },
    ],
  },
];

// Food and Grocery are handled by FoodOrder.jsx, not the generic booking form — they need a
// shop + menu + cart, not a fixed set of fields. Kept here only so other pages (My Bookings)
// can still show a friendly name/icon for them.
export const CART_CATEGORIES = [
  { code: 'food', icon: '🍲', name: 'Food Delivery' },
  { code: 'grocery', icon: '🛒', name: 'Grocery Delivery' },
];

// Tailor is handled by TailorBooking.jsx, not the generic form — it needs a shop + a real
// appointment slot, not a typed-in date/time. Kept here only for icon/name lookups elsewhere.
export const SLOT_CATEGORIES = [
  { code: 'tailor', icon: '🧵', name: 'Tailor' },
];

export function findCategory(code) {
  return CATEGORIES.find((c) => c.code === code)
    || CART_CATEGORIES.find((c) => c.code === code)
    || SLOT_CATEGORIES.find((c) => c.code === code);
}
