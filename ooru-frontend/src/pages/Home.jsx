import { useState } from 'react';
import { CATEGORIES } from '../categories';
import { apiClient, extractErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Indicative estimates only, used to pre-fill a payment amount for the demo checkout flow.
// A real version would price this from the shop's own rate card.
const ESTIMATE_RUPEES = { tailor: 300, xerox: 50, ac: 799, plumber: 400, electrician: 350 };

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle | processing | paid | failed

  function openCategory(cat) {
    setActiveCategory(cat);
    setFormValues({});
    setError('');
    setConfirmedBooking(null);
    setPaymentStatus('idle');
  }
  function closeModal() {
    setActiveCategory(null);
  }
  function updateField(id, value) {
    setFormValues((f) => ({ ...f, [id]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await apiClient.post('/bookings', {
        categoryCode: activeCategory.code,
        details: formValues,
      });
      setConfirmedBooking(res.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayNow() {
    setPaymentStatus('processing');
    const scriptOk = await loadRazorpayScript();
    if (!scriptOk) {
      setPaymentStatus('failed');
      setError('Could not load the payment gateway. Check your connection and try again.');
      return;
    }
    try {
      const amountPaise = ESTIMATE_RUPEES[activeCategory.code] * 100;
      const orderRes = await apiClient.post('/payments/create-order', {
        bookingId: confirmedBooking.id,
        amountPaise,
      });

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        amount: orderRes.data.amountPaise,
        currency: orderRes.data.currency,
        order_id: orderRes.data.razorpayOrderId,
        name: 'Altenul One',
        description: `${activeCategory.name} — ${confirmedBooking.reference}`,
        handler: async function (response) {
          try {
            await apiClient.post('/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setPaymentStatus('paid');
          } catch (err) {
            setPaymentStatus('failed');
            setError(extractErrorMessage(err));
          }
        },
        prefill: { name: user.name },
        theme: { color: '#0E6E6B' },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => setPaymentStatus('failed'));
      rzp.open();
      setPaymentStatus('idle');
    } catch (err) {
      setPaymentStatus('failed');
      setError(extractErrorMessage(err));
    }
  }

  return (
    <div className="wrap">
      <div className="card">
        <h2>Book a service</h2>
        <p className="sub">Phase 1: Tailor, Xerox, AC Service, Plumber, Electrician.</p>
        <div className="cat-grid">
          {CATEGORIES.map((cat) => (
            <button key={cat.code} className="cat-card" onClick={() => openCategory(cat)}>
              <span className="icon">{cat.icon}</span>
              <span className="name">{cat.name}</span>
              <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: 4 }}>{cat.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {activeCategory && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-head">
              <h2>{activeCategory.icon} {activeCategory.name}</h2>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>

            {!confirmedBooking ? (
              <>
                {!user && <div className="error-banner">You'll need to log in before booking — you can still fill this in first.</div>}
                {error && <div className="error-banner">{error}</div>}
                <form onSubmit={handleSubmit}>
                  {activeCategory.fields.map((f) => (
                    <div className="field" key={f.id}>
                      <label>{f.label}</label>
                      {f.type === 'select' ? (
                        <select required onChange={(e) => updateField(f.id, e.target.value)} defaultValue="">
                          <option value="" disabled>Choose one</option>
                          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={f.type} required onChange={(e) => updateField(f.id, e.target.value)} />
                      )}
                    </div>
                  ))}
                  <button className="btn full" type="submit" disabled={submitting}>
                    {submitting ? 'Sending…' : (user ? 'Send request' : 'Log in to continue')}
                  </button>
                </form>
              </>
            ) : (
              <div>
                <div className="success-banner">
                  Booked! Reference <span className="mono">{confirmedBooking.reference}</span>. Status: {confirmedBooking.status}.
                </div>
                {error && <div className="error-banner">{error}</div>}
                {paymentStatus === 'paid' ? (
                  <div className="success-banner">Payment received — verified server-side, not just trusted from the browser.</div>
                ) : ESTIMATE_RUPEES[activeCategory.code] ? (
                  <>
                    <p style={{ fontSize: '0.86rem', color: 'var(--ink-soft)' }}>
                      Estimated cost: ₹{ESTIMATE_RUPEES[activeCategory.code]}. This calls the real Razorpay
                      checkout widget — use Razorpay's test card numbers if your key is in test mode.
                    </p>
                    <button className="btn brick full" onClick={handlePayNow} disabled={paymentStatus === 'processing'}>
                      {paymentStatus === 'processing' ? 'Opening payment…' : `Pay ₹${ESTIMATE_RUPEES[activeCategory.code]} now`}
                    </button>
                  </>
                ) : (
                  <p style={{ fontSize: '0.86rem', color: 'var(--ink-soft)' }}>
                    No payment needed right now for this category — a shop or dispatcher will follow up.
                  </p>
                )}
                <button className="btn outline full" style={{ marginTop: 10 }} onClick={closeModal}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
