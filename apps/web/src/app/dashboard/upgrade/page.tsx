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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    priceLabel: "₹999",
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
    color: "bg-gradient-to-br from-amber-500 to-orange-600",
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
      <div className="bg-muted/30 rounded-2xl p-4 border">
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
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-12 rounded-xl font-bold"
          onClick={onCancel}
          disabled={processing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 h-12 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          disabled={!stripe || !elements || processing || !elementReady}
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : !elementReady ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Subscribe ₹999/month
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
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
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
          <p className="text-muted-foreground">Choose the plan that fits your business needs</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {successState && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-emerald-700 dark:text-emerald-400">
                    Welcome to Pro!
                  </h3>
                  <p className="text-sm text-emerald-600 dark:text-emerald-500">
                    Your subscription is now active. Enjoy unlimited features!
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-emerald-300 text-emerald-700"
                  onClick={() => setSuccessState(false)}
                >
                  Dismiss
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isPro && subscription?.cancelAtPeriodEnd && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-amber-700 dark:text-amber-400">
                Subscription Ending
              </h3>
              <p className="text-sm text-amber-600 dark:text-amber-500">
                Your Pro subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                You'll be downgraded to Starter after this date.
              </p>
            </div>
          </CardContent>
        </Card>
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
              <Card className={cn(
                "relative overflow-hidden transition-all duration-300 h-full",
                tier.popular && "ring-2 ring-amber-500 shadow-xl shadow-amber-500/10",
                isCurrentTier && "border-primary"
              )}>
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
                    <Sparkles className="inline h-3 w-3 mr-1" />
                    MOST POPULAR
                  </div>
                )}

                {isCurrentTier && (
                  <div className="absolute top-0 left-0 bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-br-xl">
                    CURRENT PLAN
                  </div>
                )}

                <CardHeader className="pt-8">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-4",
                    key === "pro" ? tier.color : "bg-muted"
                  )}>
                    <Icon className={cn("h-7 w-7", key === "pro" ? "text-white" : "text-muted-foreground")} />
                  </div>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">{tier.priceLabel}</span>
                    {tier.price > 0 && (
                      <span className="text-muted-foreground">/month</span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {tier.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        {feature.included ? (
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center",
                            key === "pro" ? "bg-amber-500/20 text-amber-600" : "bg-primary/20 text-primary"
                          )}>
                            <Check className="h-3 w-3" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                            <X className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <span className={cn(
                          "text-sm",
                          !feature.included && "text-muted-foreground"
                        )}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="pt-4">
                  {key === "starter" ? (
                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-xl font-bold"
                      disabled={isCurrentTier || isPro}
                    >
                      {isCurrentTier ? "Current Plan" : "Free Forever"}
                    </Button>
                  ) : (
                    <>
                      {isCurrentTier ? (
                        <Button
                          variant="outline"
                          className="w-full h-12 rounded-xl font-bold border-amber-300 text-amber-600 hover:bg-amber-50"
                          onClick={() => setCancelDialogOpen(true)}
                          disabled={subscription?.cancelAtPeriodEnd}
                        >
                          {subscription?.cancelAtPeriodEnd ? (
                            "Cancellation Scheduled"
                          ) : (
                            "Manage Subscription"
                          )}
                        </Button>
                      ) : (
                        <Button
                          className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                          onClick={handleUpgrade}
                          disabled={showCheckout}
                        >
                          <Zap className="mr-2 h-4 w-4" />
                          Upgrade to Pro
                        </Button>
                      )}
                    </>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardContent className="py-8">
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-bold">Unlimited Inventory</h3>
              <p className="text-xs text-muted-foreground">Track all your raw materials and products</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
                <ShoppingCart className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-bold">Unlimited Orders</h3>
              <p className="text-xs text-muted-foreground">Process orders without limits</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-chart-2/10 flex items-center justify-center mx-auto">
                <BarChart3 className="h-6 w-6 text-chart-2" />
              </div>
              <h3 className="font-bold">Advanced Analytics</h3>
              <p className="text-xs text-muted-foreground">Deep insights into your operations</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                <Download className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="font-bold">Data Export</h3>
              <p className="text-xs text-muted-foreground">Export to Excel, PDF, and more</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCheckout && !!clientSecret} onOpenChange={(open) => {
        if (!open) handleCheckoutCancel();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Upgrade to Pro
            </DialogTitle>
            <DialogDescription>
              Complete your payment to unlock all Pro features.
            </DialogDescription>
          </DialogHeader>

          {clientSecret && (
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#f59e0b",
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
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Choose how you'd like to cancel your Pro subscription.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Cancel at Period End</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Keep access until {subscription?.currentPeriodEnd 
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString() 
                  : "the end of your billing period"}.
              </p>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => handleCancel(false)}
                disabled={canceling}
              >
                {canceling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Cancel at Period End
              </Button>
            </div>

            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="font-medium text-destructive">Cancel Immediately</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Lose access to Pro features right now. No refund for remaining days.
              </p>
              <Button
                variant="destructive"
                className="w-full mt-2"
                onClick={() => handleCancel(true)}
                disabled={canceling}
              >
                {canceling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Cancel Immediately
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setCancelDialogOpen(false)}
              disabled={canceling}
            >
              Keep Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
