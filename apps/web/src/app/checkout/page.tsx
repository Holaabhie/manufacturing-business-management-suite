"use client";

import { useState } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, ArrowRight } from 'lucide-react';
import { openRazorpayCheckout } from '@/lib/razorpay/checkout';
import Link from 'next/link';

export default function CheckoutDemoPage() {
  const [amountPaise, setAmountPaise] = useState<number>(10000); // default ₹100 (10,000 paise)
  const [customRupees, setCustomRupees] = useState<string>('100');
  const [customerName, setCustomerName] = useState<string>('Demo Customer');
  const [customerEmail, setCustomerEmail] = useState<string>('customer@example.com');
  const [customerPhone, setCustomerPhone] = useState<string>('9999999999');

  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error' | 'cancelled'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any | null>(null);

  const presets = [
    { label: '₹1 (Min test)', paise: 100 },
    { label: '₹50', paise: 5000 },
    { label: '₹100 (Standard)', paise: 10000 },
    { label: '₹999 (Pro Monthly)', paise: 99900 },
    { label: '₹9,999 (Pro Yearly)', paise: 999900 },
  ];

  const handleSelectPreset = (paise: number) => {
    setAmountPaise(paise);
    setCustomRupees((paise / 100).toString());
  };

  const handleCustomRupeesChange = (val: string) => {
    setCustomRupees(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setAmountPaise(Math.round(num * 100));
    }
  };

  const handleStartCheckout = async () => {
    if (amountPaise < 100) {
      setStatus('error');
      setErrorMessage('Minimum amount is 100 paise (₹1.00)');
      return;
    }

    setStatus('processing');
    setErrorMessage(null);
    setPaymentDetails(null);

    await openRazorpayCheckout({
      amount: amountPaise,
      currency: 'INR',
      name: 'IND Manager Checkout Demo',
      description: `Test payment of ₹${(amountPaise / 100).toLocaleString('en-IN')}`,
      prefill: {
        name: customerName,
        email: customerEmail,
        contact: customerPhone,
      },
      onSuccess: (data) => {
        setStatus('success');
        setPaymentDetails(data);
      },
      onError: (err) => {
        setStatus('error');
        setErrorMessage(err);
      },
      onDismiss: () => {
        setStatus('cancelled');
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Razorpay Standard Checkout</h1>
              <p className="text-xs text-slate-400">Standard Web Integration & Verification</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Live Test
          </span>
        </div>

        {/* Amount Selector */}
        <div className="space-y-4 mb-6">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Select Test Amount
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.paise}
                type="button"
                onClick={() => handleSelectPreset(preset.paise)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-left ${
                  amountPaise === preset.paise
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <span className="text-sm font-semibold text-slate-400">Custom ₹:</span>
            <input
              type="number"
              min="1"
              step="any"
              value={customRupees}
              onChange={(e) => handleCustomRupeesChange(e.target.value)}
              className="flex-1 bg-slate-800/70 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="Amount in Rupees"
            />
            <span className="text-xs text-slate-500 font-mono">
              ({amountPaise} paise)
            </span>
          </div>
        </div>

        {/* Customer Prefill Info */}
        <div className="space-y-3 mb-6 p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-xs">
          <span className="font-semibold text-slate-400 uppercase tracking-wider block">
            Customer Prefill (Optional)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Name"
              className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200"
            />
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="Email"
              className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200"
            />
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone"
              className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200"
            />
          </div>
        </div>

        {/* Pay Button */}
        <button
          type="button"
          onClick={handleStartCheckout}
          disabled={status === 'processing'}
          className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-[0.99] transition-all duration-200 shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'processing' ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Opening Razorpay Modal...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Pay ₹{(amountPaise / 100).toLocaleString('en-IN')} with Razorpay
            </>
          )}
        </button>

        {/* Status / Results */}
        {status === 'success' && paymentDetails && (
          <div className="mt-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>Payment Verified Successfully!</span>
            </div>
            <div className="text-xs font-mono bg-emerald-950/60 p-3 rounded-xl border border-emerald-500/20 space-y-1 overflow-x-auto text-emerald-200">
              <div><strong>Payment ID:</strong> {paymentDetails.razorpay_payment_id}</div>
              <div><strong>Order ID:</strong> {paymentDetails.razorpay_order_id}</div>
              <div><strong>Signature:</strong> {paymentDetails.razorpay_signature}</div>
              <div><strong>Backend Verified:</strong> {paymentDetails.verificationResult?.message || 'Valid'}</div>
            </div>
          </div>
        )}

        {status === 'cancelled' && (
          <div className="mt-6 p-4 rounded-2xl bg-amber-950/30 border border-amber-500/20 text-amber-300 flex items-center gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>Checkout was closed before payment completion.</span>
          </div>
        )}

        {status === 'error' && errorMessage && (
          <div className="mt-6 p-4 rounded-2xl bg-red-950/30 border border-red-500/20 text-red-300 flex items-center gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>HMAC-SHA256 Signature Verification</span>
          </div>
          <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            Dashboard <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
