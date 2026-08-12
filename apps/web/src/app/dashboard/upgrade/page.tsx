"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  Crown,
  Check,
  X,
  Loader2,
  Sparkles,
  Zap,
  Users,
  BarChart3,
  Download,
  HeadphonesIcon,
  Package,
  ShoppingCart,
  ArrowLeft,
  Calendar,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import {
  IOSCard,
  IOSButton,
  IOSBadge
} from "@/components/ui/ios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const TIERS: Record<string, {
  name: string;
  price: number;
  priceLabel: string;
  description: string;
  icon: any;
  features: { text: string; included: boolean }[];
  color: string;
  accentColor: string;
  buttonVariant: "outline" | "default";
  popular?: boolean;
}> = {
  starter: {
    name: "Starter",
    price: 0,
    priceLabel: "Free",
    description: "Perfect for small operations getting started",
    icon: Package,
    features: [
      { text: "Up to 50 inventory items", included: true },
      { text: "Up to 100 orders/month", included: true },
      { text: "Basic reports", included: true },
      { text: "1 user", included: true },
      { text: "Advanced analytics", included: false },
      { text: "Data export (Excel/PDF)", included: false },
      { text: "Priority support", included: false },
      { text: "Multi-user access", included: false },
    ],
    color: "bg-zinc-100 dark:bg-zinc-900",
    accentColor: "text-zinc-600",
    buttonVariant: "outline" as const,
  },
  pro: {
    name: "Pro",
    price: 999,
    priceLabel: "\u20B9999",
    description: "For growing businesses that need more power",
    icon: Crown,
    features: [
      { text: "Unlimited inventory items", included: true },
      { text: "Unlimited orders", included: true },
      { text: "Basic reports", included: true },
      { text: "Up to 10 users", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Data export (Excel/PDF)", included: true },
      { text: "Priority support", included: true },
      { text: "Multi-user access", included: true },
    ],
    color: "bg-gradient-to-br from-amber-400 to-amber-600",
    accentColor: "text-amber-500",
    buttonVariant: "default" as const,
    popular: true,
  },
};

function CheckoutForm({
  onSuccess,
  onCancel,
  confirmationType
}: {
  onSuccess: () => void;
  onCancel: () => void;
  confirmationType: 'payment' | 'setup';
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [elementReady, setElementReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      const confirmFn = confirmationType === 'setup'
        ? stripe.confirmSetup
        : stripe.confirmPayment;

      const { error } = await confirmFn({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/dashboard/upgrade?success=true",
        },
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message || "Payment failed");
        setProcessing(false);
      } else {
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-[var(--muted)] rounded-[20px] p-5 border border-[var(--border)]">
        <div className="max-h-[300px] overflow-y-auto">
          <PaymentElement
            onReady={() => setElementReady(true)}
            options={{
              layout: "tabs",
            }}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <IOSButton
          type="button"
          variant="gray"
          className="flex-1 h-[50px] text-[17px] font-semibold"
          onClick={onCancel}
          disabled={processing}
        >
          Cancel
        </IOSButton>
        <IOSButton
          type="button"
          color="blue"
          className="flex-1 h-[50px] text-[17px] font-semibold bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 shadow-lg shadow-amber-500/20 border-0 text-white"
          disabled={!stripe || !elements || processing || !elementReady}
          onClick={(e) => handleSubmit(e as any)}
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : !elementReady ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Subscribe {"\u20B9"}999/month
            </>
          )}
        </IOSButton>
      </div>

      <p className="text-[13px] text-center text-[var(--muted-foreground)]">
        By subscribing, you agree to our terms. Cancel anytime from your profile settings.
      </p>
    </form>
  );
}

export default function UpgradePage() {
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [confirmationType, setConfirmationType] = useState<'payment' | 'setup'>('payment');
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [successState, setSuccessState] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setSuccessState(true);
      window.history.replaceState({}, '', '/dashboard/upgrade');
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      const userData = await res.json();
      setUser(userData);

      if (user) {
        const res = await fetch(`/api/stripe/subscription?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setSubscription(data);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Please log in to upgrade");
      return;
    }

    setShowCheckout(true);

    try {
      const res = await fetch("/api/stripe/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_1SiUfTEMNP0KHwIRvw9wlBzh",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to start subscription");
        setShowCheckout(false);
        return;
      }

      setClientSecret(data.clientSecret);
      setConfirmationType(data.confirmationType);
      setSubscriptionId(data.subscriptionId);
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
      setShowCheckout(false);
    }
  };

  const handleCancel = async (immediately = false) => {
    setCanceling(true);
    try {
      const res = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          cancelImmediately: immediately,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success(immediately
        ? "Subscription canceled immediately"
        : "Subscription will cancel at period end"
      );
      setCancelDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel subscription");
    } finally {
      setCanceling(false);
    }
  };

  const handleCheckoutSuccess = () => {
    setSuccessState(true);
    setShowCheckout(false);
    setClientSecret(null);
    fetchData();
  };

  const handleCheckoutCancel = async () => {
    if (subscriptionId) {
      try {
        await fetch("/api/stripe/cancel-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            cancelImmediately: true,
          }),
        });
      } catch (e) {
        console.error("Failed to cleanup subscription:", e);
      }
    }
    setShowCheckout(false);
    setClientSecret(null);
    setSubscriptionId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentTier = subscription?.tier || "starter";
  const isPro = currentTier === "pro";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8 pb-12"
    >
      <div className="flex items-center gap-4">
        <Link href="/dashboard/profile">
          <IOSButton variant="plain" className="w-[44px] h-[44px] rounded-full p-0 flex items-center justify-center">
            <ArrowLeft className="h-6 w-6 text-[#007AFF]" />
          </IOSButton>
        </Link>
        <div>
          <h1 className="text-[34px] font-bold tracking-tight text-[var(--foreground)]">Subscription Plans</h1>
          <p className="text-[17px] text-[var(--muted-foreground)]">Choose the plan that fits your business needs</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {successState && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <IOSCard className="border-[#34C759]/30 bg-[#34C759]/10">
              <div className="flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-full bg-[#34C759] flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[17px] font-bold text-[#15803D] dark:text-[#4ADE80]">
                    Welcome to Pro!
                  </h3>
                  <p className="text-[15px] text-[#166534] dark:text-[#22C55E]">
                    Your subscription is now active. Enjoy unlimited features!
                  </p>
                </div>
                <IOSButton
                  variant="plain"
                  className="px-4 h-[36px] bg-white border border-[#34C759]/50 text-[#15803D]"
                  onClick={() => setSuccessState(false)}
                >
                  Dismiss
                </IOSButton>
              </div>
            </IOSCard>
          </motion.div>
        )}
      </AnimatePresence>

      {isPro && subscription?.cancelAtPeriodEnd && (
        <IOSCard className="border-amber-500/30 bg-amber-500/10">
          <div className="flex items-center gap-4 p-6">
            <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-[17px] font-bold text-[#B45309] dark:text-[#FBBF24]">
                Subscription Ending
              </h3>
              <p className="text-[15px] text-[#D97706] dark:text-[#FCD34D]">
                Your Pro subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                You'll be downgraded to Starter after this date.
              </p>
            </div>
          </div>
        </IOSCard>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {Object.entries(TIERS).map(([key, tier]) => {
          const isCurrentTier = currentTier === key;
          const Icon = tier.icon;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: key === "pro" ? 0.1 : 0 }}
            >
              <IOSCard className={cn(
                "relative transition-all duration-300 h-full flex flex-col",
                tier.popular && "ring-2 ring-amber-500 shadow-[0_8px_30px_rgba(245,158,11,0.15)]",
                isCurrentTier && "border-[#007AFF] bg-[#007AFF]/5 dark:bg-[#0A84FF]/5"
              )}>
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[11px] font-bold px-4 py-1.5 rounded-bl-[16px] rounded-tr-[24px]">
                    <Sparkles className="inline h-3 w-3 mr-1" />
                    MOST POPULAR
                  </div>
                )}

                {isCurrentTier && (
                  <div className="absolute top-0 left-0 bg-[#007AFF] text-white text-[11px] font-bold px-4 py-1.5 rounded-br-[16px] rounded-tl-[24px]">
                    CURRENT PLAN
                  </div>
                )}

                <div className="px-6 pt-10 pb-4">
                  <div className={cn(
                    "w-16 h-16 rounded-[18px] flex items-center justify-center mb-5",
                    key === "pro" ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-[var(--accent)]"
                  )}>
                    <Icon className={cn("h-8 w-8", key === "pro" ? "text-white" : "text-[var(--muted-foreground)]")} />
                  </div>
                  <h3 className="text-[28px] font-bold text-[var(--foreground)] mb-2">{tier.name}</h3>
                  <p className="text-[15px] text-[var(--muted-foreground)] leading-relaxed">{tier.description}</p>
                </div>

                <div className="px-6 space-y-6 flex-1">
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-[42px] font-bold text-[var(--foreground)]">{tier.priceLabel}</span>
                    {tier.price > 0 && (
                      <span className="text-[15px] font-medium text-[var(--muted-foreground)]">/mo</span>
                    )}
                  </div>

                  <div className="space-y-4 pb-6 pt-2">
                    {tier.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-4">
                        {feature.included ? (
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                            key === "pro" ? "bg-amber-500/10 text-amber-500" : "bg-[#007AFF]/10 text-[#007AFF]"
                          )}>
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[var(--muted)] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <X className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                          </div>
                        )}
                        <span className={cn(
                          "text-[15px] leading-snug",
                          !feature.included ? "text-[var(--muted-foreground)]" : "text-[var(--foreground)]"
                        )}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 mt-auto">
                  {key === "starter" ? (
                    <IOSButton
                      variant={isCurrentTier ? "gray" : "plain"}
                      className={cn(
                        "w-full h-[50px] text-[17px] font-bold",
                        !isCurrentTier && "bg-[var(--accent)] text-[var(--foreground)]"
                      )}
                      disabled={isCurrentTier || isPro}
                    >
                      {isCurrentTier ? "Current Plan" : "Free Forever"}
                    </IOSButton>
                  ) : (
                    <>
                      {isCurrentTier ? (
                        <IOSButton
                          variant="gray"
                          className="w-full h-[50px] text-[17px] font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                          onClick={() => setCancelDialogOpen(true)}
                          disabled={subscription?.cancelAtPeriodEnd}
                        >
                          {subscription?.cancelAtPeriodEnd ? (
                            "Cancellation Scheduled"
                          ) : (
                            "Manage Subscription"
                          )}
                        </IOSButton>
                      ) : (
                        <IOSButton
                          variant="filled"
                          color="blue"
                          className="w-full h-[50px] text-[17px] font-bold bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 shadow-lg shadow-amber-500/20 border-0 text-white"
                          onClick={handleUpgrade}
                          disabled={showCheckout}
                        >
                          <Zap className="mr-2 h-5 w-5" />
                          Upgrade to Pro
                        </IOSButton>
                      )}
                    </>
                  )}
                </div>
              </IOSCard>
            </motion.div>
          );
        })}
      </div>

      <IOSCard className="border-[var(--border)] border-dashed mb-16">
        <div className="py-10 px-6">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-[18px] bg-[var(--accent)] flex items-center justify-center mx-auto shadow-sm">
                <Package className="h-7 w-7 text-[#007AFF]" />
              </div>
              <h3 className="text-[17px] font-bold text-[var(--foreground)]">Unlimited Inventory</h3>
              <p className="text-[14px] text-[var(--muted-foreground)]">Track all your raw materials and products</p>
            </div>
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-[18px] bg-[var(--accent)] flex items-center justify-center mx-auto shadow-sm">
                <ShoppingCart className="h-7 w-7 text-[#5856D6]" />
              </div>
              <h3 className="text-[17px] font-bold text-[var(--foreground)]">Unlimited Orders</h3>
              <p className="text-[14px] text-[var(--muted-foreground)]">Process orders without limits</p>
            </div>
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-[18px] bg-[var(--accent)] flex items-center justify-center mx-auto shadow-sm">
                <BarChart3 className="h-7 w-7 text-[#FF2D55]" />
              </div>
              <h3 className="text-[17px] font-bold text-[var(--foreground)]">Advanced Analytics</h3>
              <p className="text-[14px] text-[var(--muted-foreground)]">Deep insights into your operations</p>
            </div>
            <div className="space-y-3">
              <div className="w-14 h-14 rounded-[18px] bg-[var(--accent)] flex items-center justify-center mx-auto shadow-sm">
                <Download className="h-7 w-7 text-[#34C759]" />
              </div>
              <h3 className="text-[17px] font-bold text-[var(--foreground)]">Data Export</h3>
              <p className="text-[14px] text-[var(--muted-foreground)]">Export to Excel, PDF, and more</p>
            </div>
          </div>
        </div>
      </IOSCard>

      <Dialog open={showCheckout && !!clientSecret} onOpenChange={(open) => {
        if (!open) handleCheckoutCancel();
      }}>
        <DialogContent fullScreenMobile className="sm:max-w-[480px] bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px] overflow-hidden p-0">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[20px] font-semibold text-[var(--foreground)]">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <Crown className="h-5 w-5 text-amber-500" />
                </div>
                Upgrade to Pro
              </DialogTitle>
              <DialogDescription className="text-[14px] text-[var(--muted-foreground)] mt-1.5">
                Complete your payment to unlock all Pro features.
              </DialogDescription>
            </DialogHeader>

            {clientSecret && (
              <div className="mt-6">
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "#F59E0B",
                        borderRadius: "12px",
                      },
                    },
                  }}
                >
                  <CheckoutForm
                    onSuccess={handleCheckoutSuccess}
                    onCancel={handleCheckoutCancel}
                    confirmationType={confirmationType}
                  />
                </Elements>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent fullScreenMobile className="sm:max-w-[440px] bg-white/80 dark:bg-[rgba(28,28,30,0.8)] backdrop-blur-[40px] border border-white/20 dark:border-white/10 shadow-[var(--shadow-lg)] rounded-[24px] overflow-hidden p-0">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-[20px] font-semibold text-[var(--foreground)]">Cancel Subscription</DialogTitle>
              <DialogDescription className="text-[14px] text-[var(--muted-foreground)] mt-1.5">
                Choose how you'd like to cancel your Pro subscription.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className="p-4 rounded-[16px] bg-[var(--accent)] space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
                  <span className="font-semibold text-[var(--foreground)]">Cancel at Period End</span>
                </div>
                <p className="text-[13px] text-[var(--muted-foreground)]">
                  Keep access until {subscription?.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                    : "the end of your billing period"}.
                </p>
                <IOSButton
                  variant="gray"
                  className="w-full mt-3 h-[44px] text-[15px] font-semibold"
                  onClick={() => handleCancel(false)}
                  disabled={canceling}
                >
                  {canceling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Cancel at Period End
                </IOSButton>
              </div>

              <div className="p-4 rounded-[16px] border border-[#FF3B30]/20 bg-[#FF3B30]/5 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[#FF3B30]" />
                  <span className="font-semibold text-[#FF3B30]">Cancel Immediately</span>
                </div>
                <p className="text-[13px] text-[var(--muted-foreground)]">
                  Lose access to Pro features right now. No refund for remaining days.
                </p>
                <IOSButton
                  variant="destructive"
                  className="w-full mt-3 h-[44px] text-[15px] font-semibold"
                  onClick={() => handleCancel(true)}
                  disabled={canceling}
                >
                  {canceling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Cancel Immediately
                </IOSButton>
              </div>
            </div>

            <DialogFooter className="flex pt-2 border-t border-[var(--border)] border-x-[-24px] mx-[-24px] px-6 pb-2">
              <IOSButton
                variant="plain"
                className="w-full h-[44px] text-[15px] font-semibold text-[#007AFF]"
                onClick={() => setCancelDialogOpen(false)}
                disabled={canceling}
              >
                Keep Subscription
              </IOSButton>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
