import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, CreditCard, Smartphone, Banknote, CheckCircle, Printer, ArrowLeft, Loader2, Clock, History, AlertTriangle } from 'lucide-react';
import { CartItem, OrderRecord } from '../types';
import { sound } from '../utils/audio';

interface CheckoutModalProps {
  isOpen: boolean;
  items: CartItem[];
  orderHistory: OrderRecord[];
  initialViewHistory?: boolean;
  onClose: () => void;
  onCompleteOrder: (order: OrderRecord) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  items,
  orderHistory,
  initialViewHistory = false,
  onClose,
  onCompleteOrder,
}) => {
  if (!isOpen) return null;

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet' | 'cash'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderRecord | null>(null);
  const [viewHistory, setViewHistory] = useState(initialViewHistory || (items.length === 0 && orderHistory.length > 0));

  // Conveyor Belt Scan Simulation (items appear one by one with scan beep)
  const [scannedIndex, setScannedIndex] = useState<number>(0);
  const [printedLinesCount, setPrintedLinesCount] = useState<number>(0);

  // Card Form Validation
  const [cardName, setCardName] = useState('Alex Morgan');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExp, setCardExp] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('888');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const subtotal = items.reduce((sum, item) => {
    const price = item.product.isSale && item.product.salePrice ? item.product.salePrice : item.product.price;
    return sum + price * item.quantity;
  }, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  // Running total calculation up to scannedIndex
  const scannedItems = items.slice(0, scannedIndex);
  const runningSubtotal = scannedItems.reduce((sum, item) => {
    const price = item.product.isSale && item.product.salePrice ? item.product.salePrice : item.product.price;
    return sum + price * item.quantity;
  }, 0);
  const runningTax = runningSubtotal * 0.08;
  const runningTotal = runningSubtotal + runningTax;

  // Animate items onto belt sequentially
  useEffect(() => {
    if (scannedIndex < items.length) {
      const timer = setTimeout(() => {
        sound.playScanBeep();
        setScannedIndex((idx) => idx + 1);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [scannedIndex, items.length]);

  // Sequential line-by-line receipt printer animation
  useEffect(() => {
    if (completedOrder && printedLinesCount < completedOrder.items.length + 5) {
      const timer = setTimeout(() => {
        setPrintedLinesCount((cnt) => cnt + 1);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [completedOrder, printedLinesCount]);

  const validateCardForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!cardName.trim()) {
      errors.name = 'Cardholder name is required';
    }
    const cleanNum = cardNumber.replace(/\s+/g, '');
    if (cleanNum.length < 16) {
      errors.number = 'Please enter a valid 16-digit card number';
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExp)) {
      errors.exp = 'Expiry must be in MM/YY format';
    }
    if (cardCvv.length < 3) {
      errors.cvv = 'CVV must be 3 digits';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePay = () => {
    if (paymentMethod === 'card' && !validateCardForm()) {
      return;
    }

    setIsProcessing(true);
    sound.playScanBeep();

    setTimeout(() => {
      setIsProcessing(false);
      sound.playPaymentSuccess();

      try {
        confetti({
          particleCount: 85,
          spread: 75,
          origin: { y: 0.6 },
        });
      } catch {}

      const newOrder: OrderRecord = {
        orderId: `OMG-${Math.floor(100000 + Math.random() * 900000)}`,
        timestamp: Date.now(),
        items: [...items],
        subtotal,
        tax,
        total,
        paymentMethod,
      };

      setCompletedOrder(newOrder);
      setPrintedLinesCount(0);
      onCompleteOrder(newOrder);
    }, 1500); // 1.5s processing animation as specified
  };

  const handleReset = () => {
    setCompletedOrder(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-xl bg-[#101A3A] border border-slate-700/80 rounded-2xl shadow-2xl text-[#F7F6F2] overflow-hidden">
        {/* Terminal Top Bar */}
        <div className="p-4 px-6 bg-[#182346] border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#19C39A]/20 text-[#19C39A] flex items-center justify-center text-xs font-bold font-heading">
              01
            </div>
            <div>
              <h2 className="font-heading font-bold text-sm text-white">
                Lane 01 · Conveyor Checkout Terminal
              </h2>
              <span className="text-[10px] text-slate-400">Omega Self-Service System</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewHistory(!viewHistory)}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#101A3A] hover:bg-[#202E5C] text-slate-300 rounded-lg text-[11px] border border-slate-700 transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({orderHistory.length})</span>
            </button>

            {!completedOrder && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Demo Simulation Notice Banner */}
        <div className="bg-[#5B3DF5]/15 border-b border-[#5B3DF5]/30 px-6 py-2 flex items-center justify-between text-[11px] text-[#CBD5E1]">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Interactive Demo Mode</span>
          </div>
          <span>No real payments or financial charges are processed.</span>
        </div>

        {/* Order History View */}
        {viewHistory ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-white">Previous Orders</h3>
              <button
                onClick={() => setViewHistory(false)}
                className="text-xs text-[#5B3DF5] hover:underline"
              >
                Back to Checkout
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {orderHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No orders completed yet in this session.
                </div>
              ) : (
                orderHistory.map((order) => (
                  <div key={order.orderId} className="bg-[#182346] p-3.5 rounded-xl border border-slate-700 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-mono-numbers">{order.orderId}</span>
                      <span className="text-[10px] text-slate-400">{new Date(order.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {order.items.map((it) => `${it.quantity}x ${it.product.name}`).join(', ')}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700/60 font-mono-numbers">
                      <span className="uppercase text-[10px] text-slate-400">{order.paymentMethod}</span>
                      <span className="font-bold text-[#19C39A] text-sm">${order.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : completedOrder ? (
          /* Receipt Screen with line-by-line printing effect */
          <div className="p-6 md:p-8 space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#19C39A]/20 text-[#19C39A] flex items-center justify-center">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-extrabold text-xl text-white">Payment Authorized</h3>
              <p className="text-xs text-slate-400">
                Receipt printing below. Thank you for shopping with Omega.
              </p>
            </div>

            {/* Paper Receipt with sequential printing lines */}
            <div className="bg-[#F7F6F2] text-[#101A3A] p-5 rounded-xl border border-slate-300 font-mono-numbers text-xs space-y-3 shadow-inner">
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <h4 className="font-heading font-bold text-sm tracking-wider text-[#101A3A] uppercase">
                  OMEGA SUPERMARKET
                </h4>
                <p className="text-[11px] text-slate-600">40 Concourse Avenue · Lane 01</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Order: {completedOrder.orderId} · {new Date(completedOrder.timestamp).toLocaleString()}
                </p>
              </div>

              {/* Items print line by line */}
              <div className="space-y-1.5 min-h-[80px]">
                {completedOrder.items.map((item, idx) => {
                  const price =
                    item.product.isSale && item.product.salePrice
                      ? item.product.salePrice
                      : item.product.price;
                  const isVisible = idx < printedLinesCount;
                  if (!isVisible) return null;

                  return (
                    <div key={idx} className="flex justify-between text-[11px] animate-fade-in">
                      <span className="truncate pr-2">
                        {item.quantity}x {item.product.name}
                      </span>
                      <span className="shrink-0 font-semibold font-mono-numbers">
                        ${(price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              {printedLinesCount >= completedOrder.items.length && (
                <div className="pt-2 border-t border-dashed border-slate-400 space-y-1 text-[11px] animate-fade-in">
                  <div className="flex justify-between">
                    <span>SUBTOTAL</span>
                    <span>${completedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SALES TAX (8.00%)</span>
                    <span>${completedOrder.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-400 text-[#101A3A]">
                    <span>TOTAL AMOUNT</span>
                    <span>${completedOrder.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                    <span>METHOD</span>
                    <span className="uppercase">{completedOrder.paymentMethod} (APPROVED)</span>
                  </div>
                </div>
              )}

              {/* Barcode */}
              <div className="pt-3 text-center">
                <div
                  className="inline-block bg-[#101A3A] h-8 w-52 mx-auto"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, #000 0, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px)',
                  }}
                />
                <p className="text-[9px] text-slate-500 mt-1">{completedOrder.orderId}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#182346] hover:bg-[#202E5C] text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>

              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5B3DF5] hover:bg-[#6B4FF8] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#5B3DF5]/30 transition-all"
              >
                <span>Continue Shopping</span>
              </button>
            </div>
          </div>
        ) : (
          /* Conveyor Scan & Payment View */
          <div className="p-6 space-y-5">
            {/* Belt Scanning Strip & Live Running Total */}
            <div className="bg-[#182346] border border-slate-700/80 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                  Belt Scanner Feed ({scannedIndex} / {items.length} items scanned)
                </span>
                <span className="font-heading font-extrabold text-base text-[#19C39A] font-mono-numbers">
                  ${runningTotal.toFixed(2)}
                </span>
              </div>

              {/* Mini Conveyor Belt Items Bar */}
              <div className="h-8 bg-[#101A3A] rounded-lg border border-slate-700/60 flex items-center gap-2 px-2 overflow-hidden">
                {items.map((it, idx) => (
                  <div
                    key={it.product.id}
                    className={`h-5 px-2 rounded flex items-center text-[10px] font-bold text-white transition-all ${
                      idx < scannedIndex
                        ? 'opacity-100 scale-100'
                        : 'opacity-20 scale-90'
                    }`}
                    style={{ backgroundColor: it.product.baseColor }}
                  >
                    {it.product.name.slice(0, 10)}...
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Choose Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-[#5B3DF5]/20 border-[#5B3DF5] text-white'
                      : 'bg-[#182346]/60 border-slate-800 text-slate-400 hover:bg-[#182346]'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-[#5B3DF5]" />
                  <span>Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('wallet')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all ${
                    paymentMethod === 'wallet'
                      ? 'bg-[#5B3DF5]/20 border-[#5B3DF5] text-white'
                      : 'bg-[#182346]/60 border-slate-800 text-slate-400 hover:bg-[#182346]'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-[#19C39A]" />
                  <span>Digital Wallet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-[#5B3DF5]/20 border-[#5B3DF5] text-white'
                      : 'bg-[#182346]/60 border-slate-800 text-slate-400 hover:bg-[#182346]'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-amber-400" />
                  <span>Cash Desk</span>
                </button>
              </div>
            </div>

            {/* Payment Method Forms */}
            {paymentMethod === 'card' && (
              <div className="bg-[#182346]/60 border border-slate-700/80 rounded-xl p-4 space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full bg-[#101A3A] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  {formErrors.name && (
                    <span className="text-[10px] text-[#FF5A4D] mt-0.5 block">{formErrors.name}</span>
                  )}
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-[#101A3A] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono-numbers text-white"
                  />
                  {formErrors.number && (
                    <span className="text-[10px] text-[#FF5A4D] mt-0.5 block">{formErrors.number}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Expires (MM/YY)
                    </label>
                    <input
                      type="text"
                      value={cardExp}
                      onChange={(e) => setCardExp(e.target.value)}
                      className="w-full bg-[#101A3A] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono-numbers text-white"
                    />
                    {formErrors.exp && (
                      <span className="text-[10px] text-[#FF5A4D] mt-0.5 block">{formErrors.exp}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Security Code (CVV)
                    </label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full bg-[#101A3A] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono-numbers text-white"
                    />
                    {formErrors.cvv && (
                      <span className="text-[10px] text-[#FF5A4D] mt-0.5 block">{formErrors.cvv}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'wallet' && (
              <div className="bg-[#182346]/60 border border-slate-700/80 rounded-xl p-5 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-[#19C39A]/15 text-[#19C39A] flex items-center justify-center">
                  <Smartphone className="w-5 h-5 animate-pulse-slow" />
                </div>
                <p className="text-xs text-slate-200 font-medium">
                  Contactless Terminal Active · Hold your smartphone near the display reader
                </p>
              </div>
            )}

            {paymentMethod === 'cash' && (
              <div className="bg-[#182346]/60 border border-slate-700/80 rounded-xl p-5 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Banknote className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-200 font-medium">
                  Insert notes or coins into the cashier register feeder below
                </p>
              </div>
            )}

            {/* Authorize Payment CTA */}
            <button
              disabled={isProcessing}
              onClick={handlePay}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#19C39A] hover:bg-[#16A34A] active:scale-98 disabled:opacity-50 text-[#101A3A] text-xs font-bold rounded-xl shadow-lg shadow-[#19C39A]/20 transition-all tracking-wide"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#101A3A]" />
                  <span>Validating Payment (1.5s)...</span>
                </>
              ) : (
                <span>Confirm Demo Payment (${total.toFixed(2)})</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
