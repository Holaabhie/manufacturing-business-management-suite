"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Factory, Building2, MapPin, Building, Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form state corresponding to the 5 modules
    const [formData, setFormData] = useState({
        // Step 1: Identity
        company_name: "",
        trade_name: "",
        phone: "",
        email: "",
        logo_url: "",

        // Step 2: Business & Compliance
        business_type: "Manufacturer",
        industry_type: "",
        gst_number: "",
        tax_regime: "Regular",
        pan_number: "",
        msme_category: "",
        financial_year_start: "April",

        // Step 3: Address
        reg_address_line_1: "",
        reg_address_line_2: "",
        reg_city: "",
        reg_state: "",
        reg_pincode: "",

        // Step 4: Banking
        bank_name: "",
        bank_account_number: "",
        bank_ifsc: "",
        upi_id: "",

        // Step 5: Branding
        invoice_prefix: "INV-",
        order_prefix: "ORD-",
        brand_primary_color: "#2563EB",
        brand_secondary_color: "#1E40AF",
    });

    const updateData = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const submitOnboarding = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/v1/company/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    // Ensuring integers are properly coerced if needed
                })
            });
            const json = await res.json();

            if (!res.ok) {
                toast.error(json.error || "Failed to complete setup");
                console.error(json.errors); // Log zod errors if any
                setLoading(false);
                return;
            }

            toast.success(`Welcome to IND Manager, ${formData.company_name}! 🎉`);
            setTimeout(() => {
                router.push("/dashboard?tour=true");
            }, 2000);

        } catch (error) {
            toast.error("Network error during setup.");
            setLoading(false);
        }
    };

    const nextStep = () => {
        // Basic validation per step can go here
        if (step === 1 && (!formData.company_name || !formData.email || !formData.phone)) {
            return toast.error("Please fill all required identity fields.");
        }
        if (step === 2 && (!formData.business_type || !formData.industry_type)) {
            return toast.error("Please select business and industry types.");
        }
        if (step === 3 && (!formData.reg_address_line_1 || !formData.reg_city || !formData.reg_state || !formData.reg_pincode)) {
            return toast.error("Please complete your registered address.");
        }

        if (step === 5) {
            submitOnboarding();
        } else {
            setStep((s) => s + 1);
        }
    };

    const prevStep = () => setStep((s) => s - 1);

    const steps = [
        { id: 1, label: "Identity", icon: <Building2 className="w-4 h-4" /> },
        { id: 2, label: "Business", icon: <Factory className="w-4 h-4" /> },
        { id: 3, label: "Location", icon: <MapPin className="w-4 h-4" /> },
        { id: 4, label: "Banking", icon: <Building className="w-4 h-4" /> },
        { id: 5, label: "Branding", icon: <Palette className="w-4 h-4" /> }
    ];

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-3xl flex flex-col gap-8">
                {/* Header Sequence */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight">Let's set up your workspace</h1>
                    <p className="text-zinc-500 font-medium text-lg">Takes about 3 minutes. We'll pre-configure industry-smart defaults.</p>
                </div>

                {/* Progress Indicators */}
                <div className="flex items-center justify-between relative mb-8">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-zinc-200 dark:bg-zinc-800 -z-10 rounded-full" />
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 rounded-full transition-all duration-500"
                        style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
                    />

                    {steps.map((s) => (
                        <div key={s.id} className="flex flex-col items-center gap-2">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300",
                                step >= s.id
                                    ? 'bg-primary border-primary text-white'
                                    : 'bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-400'
                            )}>
                                {step > s.id ? <CheckCircle2 className="w-5 h-5 text-white" /> : s.icon}
                            </div>
                            <span className={cn(
                                "text-xs font-bold uppercase tracking-wider hidden sm:block",
                                step >= s.id ? 'text-primary' : 'text-zinc-400'
                            )}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>

                <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
                    <CardContent className="p-8 sm:p-12">
                        {/* STEP 1 */}
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div>
                                    <h2 className="text-2xl font-bold">🏢 What's your company called?</h2>
                                    <p className="text-zinc-500 text-sm mt-1">This will appear on all your compliance documents and invoices.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Company Name *</Label>
                                        <Input
                                            value={formData.company_name}
                                            onChange={(e) => updateData("company_name", e.target.value)}
                                            placeholder="Bharat Textiles Pvt Ltd"
                                            className="h-12"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Trade Name (if different)</Label>
                                        <Input
                                            value={formData.trade_name}
                                            onChange={(e) => updateData("trade_name", e.target.value)}
                                            placeholder="Bharat Fabrics"
                                            className="h-12"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Phone *</Label>
                                            <Input
                                                value={formData.phone}
                                                onChange={(e) => updateData("phone", e.target.value)}
                                                placeholder="+91 98765 43210"
                                                className="h-12"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Email *</Label>
                                            <Input
                                                value={formData.email}
                                                onChange={(e) => updateData("email", e.target.value)}
                                                placeholder="admin@company.com"
                                                type="email"
                                                className="h-12"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2 */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div>
                                    <h2 className="text-2xl font-bold">📋 Tell us about your business</h2>
                                    <p className="text-zinc-500 text-sm mt-1">We'll configure smart defaults based on your industry and tax constraints.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Business Type *</Label>
                                            <Select value={formData.business_type} onValueChange={(v) => updateData("business_type", v)}>
                                                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {['Manufacturer', 'Trader', 'Service', 'Retailer', 'Wholesaler', 'Distributor', 'Other'].map(b => (
                                                        <SelectItem key={b} value={b}>{b}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Industry *</Label>
                                            <Select value={formData.industry_type} onValueChange={(v) => updateData("industry_type", v)}>
                                                <SelectTrigger className="h-12"><SelectValue placeholder="Select Industry..." /></SelectTrigger>
                                                <SelectContent>
                                                    {['Textile', 'Steel', 'Pharma', 'Food', 'Auto Parts', 'Chemicals', 'Electronics', 'Plastics', 'Paper', 'Engineering', 'FMCG', 'Construction', 'IT Services', 'Other'].map(i => (
                                                        <SelectItem key={i} value={i}>{i}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>GST Number</Label>
                                        <Input
                                            value={formData.gst_number}
                                            onChange={(e) => updateData("gst_number", e.target.value)}
                                            placeholder="27AADCB2230M1ZT"
                                            className="h-12 uppercase"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Tax Regime</Label>
                                            <Select value={formData.tax_regime} onValueChange={(v) => updateData("tax_regime", v)}>
                                                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Regular">Regular</SelectItem>
                                                    <SelectItem value="Composition">Composition</SelectItem>
                                                    <SelectItem value="Unregistered">Unregistered</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Financial Year Starts</Label>
                                            <Select value={formData.financial_year_start} onValueChange={(v) => updateData("financial_year_start", v)}>
                                                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="April">April-March (India standard)</SelectItem>
                                                    <SelectItem value="January">January-December</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3 */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div>
                                    <h2 className="text-2xl font-bold">📍 Registered Address</h2>
                                    <p className="text-zinc-500 text-sm mt-1">Official physical footprint of your organization.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Address Line 1 *</Label>
                                        <Input
                                            value={formData.reg_address_line_1}
                                            onChange={(e) => updateData("reg_address_line_1", e.target.value)}
                                            className="h-12"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Address Line 2</Label>
                                        <Input
                                            value={formData.reg_address_line_2}
                                            onChange={(e) => updateData("reg_address_line_2", e.target.value)}
                                            className="h-12"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>City *</Label>
                                            <Input
                                                value={formData.reg_city}
                                                onChange={(e) => updateData("reg_city", e.target.value)}
                                                className="h-12"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>State *</Label>
                                            <Input
                                                value={formData.reg_state}
                                                onChange={(e) => updateData("reg_state", e.target.value)}
                                                className="h-12"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Pincode *</Label>
                                            <Input
                                                value={formData.reg_pincode}
                                                onChange={(e) => updateData("reg_pincode", e.target.value)}
                                                className="h-12"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 4 */}
                        {step === 4 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div>
                                    <h2 className="text-2xl font-bold">🏦 Banking & Documents</h2>
                                    <p className="text-zinc-500 text-sm mt-1">For collecting payments on invoices correctly.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Bank Name</Label>
                                        <Input
                                            value={formData.bank_name}
                                            onChange={(e) => updateData("bank_name", e.target.value)}
                                            placeholder="SBI / HDFC / ICICI"
                                            className="h-12"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Account Number</Label>
                                            <Input
                                                value={formData.bank_account_number}
                                                onChange={(e) => updateData("bank_account_number", e.target.value)}
                                                className="h-12"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>IFSC Code</Label>
                                            <Input
                                                value={formData.bank_ifsc}
                                                onChange={(e) => updateData("bank_ifsc", e.target.value)}
                                                placeholder="SBIN0001234"
                                                className="h-12 uppercase"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>UPI ID (Optional)</Label>
                                        <Input
                                            value={formData.upi_id}
                                            onChange={(e) => updateData("upi_id", e.target.value)}
                                            placeholder="company@upi"
                                            className="h-12"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 5 */}
                        {step === 5 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                <div>
                                    <h2 className="text-2xl font-bold">🎨 Branding & Flow</h2>
                                    <p className="text-zinc-500 text-sm mt-1">Reflect your company style across invoices and dashboard.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Invoice Prefix</Label>
                                            <Input
                                                value={formData.invoice_prefix}
                                                onChange={(e) => updateData("invoice_prefix", e.target.value)}
                                                className="h-12 font-mono uppercase"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Order Prefix</Label>
                                            <Input
                                                value={formData.order_prefix}
                                                onChange={(e) => updateData("order_prefix", e.target.value)}
                                                className="h-12 font-mono uppercase"
                                            />
                                        </div>
                                    </div>

                                    {/* Simplified UI preview section since this is fundamental config mode */}
                                    <div className="mt-8 p-6 rounded-2xl border" style={{ borderColor: formData.brand_primary_color }}>
                                        <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">Live Branding Preview</h4>
                                        <div className="flex gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
                                                <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                                            </div>
                                            <Button style={{ backgroundColor: formData.brand_primary_color }}>
                                                Action Button
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-12 flex items-center justify-between pt-6 border-t">
                            <Button
                                variant="ghost"
                                onClick={prevStep}
                                disabled={step === 1 || loading}
                                className="h-12 px-6"
                            >
                                ← Back
                            </Button>

                            <Button
                                onClick={nextStep}
                                disabled={loading}
                                className="h-12 px-10 rounded-xl font-bold text-lg shadow-xl shadow-primary/20"
                            >
                                {loading && <div className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full mr-2" />}
                                {step === 5 ? "Complete Setup ✓" : "Continue →"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div >
        </div >
    );
}
