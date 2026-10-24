import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { X, CreditCard, Smartphone, Banknote, CheckCircle, Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { CartItem, OrderRecord } from '../types';
import { sound } from '../utils/audio';

interface CheckoutModalProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onCompleteOrder: (order: OrderRecord) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  items,
  onClose,
  onCompleteOrder,
}) => {
  if (!isOpen) return null;

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet' | 'cash'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderRecord | null>(null);

  // Fake Form State
  const [cardName, setCardName] = useState('Alex Morgan');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [cardExp, setCardExp] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('888');

  const subtotal = items.reduce((sum, item) => {
    const price = item.product.isSale && item.product.salePrice ? item.product.salePrice : item.product.price;
    return sum + price * item.quantity;
  }, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handlePay = () => {
    setIsProcessing(true);
    sound.playScanBeep();

    setTimeout(() => {
      setIsProcessing(false);
      sound.playPaymentSuccess();

      // Trigger confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
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
      onCompleteOrder(newOrder);
    }, 1400);
  };

  const handleReset = () => {
    setCompletedOrder(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 overflow-hidden">
        {/* Top Header */}
        <div className="p-4 px-6 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
              1
            </div>
            <h2 className="font-heading font-bold text-base text-white">
              Checkout Lane 1 · Conveyor Belt Terminal
            </h2>
          </div>
          {!completedOrder && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Completed Order Receipt Screen */}
        {completedOrder ? (
          <div className="p-6 md:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-extrabold text-xl text-white">Payment Approved</h3>
              <p className="text-xs text-slate-400">
                Thank you for shopping at Omega Supermarket!
              </p>
            </div>

            {/* Paper-Style Receipt */}
            <div className="bg-amber-50 text-slate-900 p-5 rounded-xl border border-amber-200/80 font-mono-numbers text-xs space-y-3 shadow-inner">
              <div className="text-center pb-2 border-b border-dashed border-amber-300">
                <h4 className="font-heading font-bold text-sm tracking-wide text-slate-900 uppercase">
                  OMEGA SUPERMARKET #084
                </h4>
                <p className="text-[11px] text-slate-600">42 Central Concourse · Lane 01</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Order ID: {completedOrder.orderId} · {new Date(completedOrder.timestamp).toLocaleString()}
                </p>
              </div>

              {/* Itemized list */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {completedOrder.items.map((item, idx) => {
                  const price =
                    item.product.isSale && item.product.salePrice
                      ? item.product.salePrice
                      : item.product.price;
                  return (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span className="truncate pr-2">
                        {item.quantity}x {item.product.name}
                      </span>
                      <span className="shrink-0 font-semibold">
                        ${(price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="pt-2 border-t border-dashed border-amber-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>SUBTOTAL</span>
                  <span>${completedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TAX (8.00%)</span>
                  <span>${completedOrder.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-extrabold pt-1 border-t border-amber-300 text-slate-950">
                  <span>TOTAL PAID</span>
                  <span>${completedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>METHOD</span>
                  <span className="uppercase">{completedOrder.paymentMethod} (APPROVED)</span>
                </div>
              </div>

              {/* Receipt Barcode */}
              <div className="pt-3 text-center">
                <div className="inline-block bg-slate-900 h-8 w-48 mx-auto" style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, #000 0, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 7px, #fff 7px, #fff 9px)'
                }} />
                <p className="text-[9px] text-slate-500 mt-1">{completedOrder.orderId}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>

              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-600/30 transition-all"
              >
                <span>Continue Shopping</span>
              </button>
            </div>
          </div>
        ) : (
          /* Payment Flow */
          <div className="p-6 space-y-6">
            {/* Belt Summary Strip */}
            <div className="bg-slate-800/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">Items on Conveyor</span>
                <span className="text-sm font-semibold text-white">
                  {items.reduce((s, i) => s + i.quantity, 0)} items scanned
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Total Due</span>
                <span className="font-heading font-extrabold text-xl text-emerald-400 font-mono-numbers">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <span>Credit Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('wallet')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all ${
                    paymentMethod === 'wallet'
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Digital Wallet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-medium transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-amber-400" />
                  <span>Cash Register</span>
                </button>
              </div>
            </div>

            {/* Card Form Preview */}
            {paymentMethod === 'card' && (
              <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono-numbers text-slate-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Expires
                    </label>
                    <input
                      type="text"
                      value={cardExp}
                      onChange={(e) => setCardExp(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono-numbers text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      CVV
                    </label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono-numbers text-slate-200"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'wallet' && (
              <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 text-center space-y-2">
                <p className="text-xs text-slate-300">
                  Ready to tap! Hold your smartphone or contactless card near the NFC terminal glass.
                </p>
                <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 animate-bounce" />
                </div>
              </div>
            )}

            {paymentMethod === 'cash' && (
              <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 text-center space-y-2">
                <p className="text-xs text-slate-300">
                  Insert exact cash or bills into the cashier bill feeder terminal.
                </p>
                <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Banknote className="w-5 h-5" />
                </div>
              </div>
            )}

            {/* Pay Button */}
            <button
              disabled={isProcessing}
              onClick={handlePay}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all tracking-wide"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <span>Confirm &amp; Authorize ${total.toFixed(2)}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
