"use client";

import {Button} from "@/components/ui/button";
import {ArrowRight, Check, Zap} from "lucide-react";
import {useState} from "react";

export default function Home() {
  const [selectedPlan, setSelectedPlan] = useState("freemium");

  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          {/* Brand */}
          <div className="space-y-6">
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-light tracking-tight text-balance">
              Bleak AI
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground font-light">
              Stop making users type everything.
            </p>
          </div>

          {/* Subheading */}
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Turn "please tell me about..." into date pickers, sliders, and
            dropdowns. Choose the AI tool that works for you.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              className="px-8 py-6 text-base font-medium"
              onClick={() => (window.location.href = "/chat")}
            >
              Start Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 py-6 text-base font-medium bg-transparent"
              onClick={() =>
                document
                  .getElementById("products")
                  ?.scrollIntoView({behavior: "smooth"})
              }
            >
              Explore Products
            </Button>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-24 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl sm:text-5xl font-light tracking-tight">
              Two Powerful Tools
            </h2>
            <p className="text-lg text-muted-foreground">
              Choose the AI solution that fits your needs
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Product 1: Normal Chatbot */}
            <ProductCard
              title="Chatbot"
              description="Intelligent conversation with structured data collection"
              features={[
                "Natural language understanding",
                "Smart form generation",
                "Real-time responses",
                "Multi-turn conversations"
              ]}
              previewType="chatbot"
            />

            {/* Product 2: Prompt Optimization Agent */}
            <ProductCard
              title="Prompt Optimization Agent"
              description="Advanced prompt optimization and refinement"
              features={[
                "Prompt enhancement",
                "Context optimization",
                "Multi-model support",
                "Performance analytics"
              ]}
              previewType="agent"
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl sm:text-5xl font-light tracking-tight">
              How it Works
            </h2>
            <p className="text-lg text-muted-foreground">
              What are BleakAI chatbots and what differences it from a normal
              chatbot
            </p>
          </div>
          {/* Concept Preview - Clean comparison */}
          <div className="content-max">
            <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 text-left">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Normal Chatbot
                  </h3>
                  <div className="bg-background rounded border border-border p-6 space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      "What's your experience level? Type: beginner,
                      intermediate, or advanced"
                    </p>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm border rounded bg-muted/30 text-muted-foreground"
                      placeholder="User types: intermediate i guess"
                      readOnly
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Bleak AI Chatbot
                  </h3>
                  <div className="bg-background rounded border border-border p-6 space-y-4">
                    <label className="text-sm font-medium text-foreground block">
                      What's your experience level?
                    </label>
                    <div className="space-y-3">
                      {["Beginner", "Intermediate", "Advanced"].map(
                        (level, idx) => (
                          <div key={level} className="flex items-center">
                            <input
                              type="radio"
                              name="experience"
                              className="mr-3 accent-primary"
                              defaultChecked={idx === 1}
                              readOnly
                            />
                            <span className="text-sm text-foreground">
                              {level}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section 
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl sm:text-5xl font-light tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <PricingCard
              name="Freemium"
              price="Free"
              description="Perfect for getting started"
              features={[
                "Up to 100 requests/month",
                "Basic chatbot features",
                "Standard models",
                "Community support",
                "Basic analytics"
              ]}
              isSelected={selectedPlan === "freemium"}
              onSelect={() => setSelectedPlan("freemium")}
              cta="Get Started"
              ctaVariant="outline"
            />

            <PricingCard
              name="Pro"
              price="$29"
              period="/month"
              description="For power users"
              features={[
                "Unlimited requests",
                "Advanced chatbot features",
                "Premium AI models",
                "Priority support",
                "Advanced analytics",
                "Custom integrations"
              ]}
              isSelected={selectedPlan === "pro"}
              onSelect={() => setSelectedPlan("pro")}
              cta="Start Free Trial"
              ctaVariant="default"
              highlighted
            />
          </div>
        </div>
      </section>*/}

      {/* Final CTA Section */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl font-light tracking-tight">
              Ready to Transform Your AI?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join teams building smarter AI experiences with structured data.
            </p>
          </div>

          <Button
            size="lg"
            className="px-8 py-6 text-base font-medium"
            onClick={() => (window.location.href = "/chat")}
          >
            Start Building Now
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}

function ProductCard({
  title,
  description,
  features,
  previewType
}: {
  title: string;
  description: string;
  features: string[];
  previewType: "chatbot" | "agent";
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
      {/* Preview Area */}
      <div className="bg-muted/50 aspect-video flex items-center justify-center border-b border-border">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-primary/10 rounded-lg mx-auto flex items-center justify-center">
            {previewType === "chatbot" ? (
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            ) : (
              <Zap className="w-8 h-8 text-primary" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {previewType === "chatbot"
              ? "Interactive Chat Demo"
              : "Prompt Optimization Demo"}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          variant="outline"
          className="w-full bg-transparent"
          onClick={() => (window.location.href = "/chat")}
        >
          Try {title}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  isSelected,
  onSelect,
  cta,
  ctaVariant,
  highlighted
}: {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  isSelected: boolean;
  onSelect: () => void;
  cta: string;
  ctaVariant: "default" | "outline";
  highlighted?: boolean;
}) {
  return (
    <div
      className={`relative rounded-lg border transition-all cursor-pointer ${
        highlighted
          ? "border-primary bg-primary/5 shadow-lg scale-105 md:scale-100"
          : "border-border bg-card hover:border-primary/50"
      }`}
      onClick={onSelect}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
          Most Popular
        </div>
      )}

      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold">{name}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {/* Price */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-light">{price}</span>
            {period && (
              <span className="text-muted-foreground text-sm">{period}</span>
            )}
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-3">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          variant={ctaVariant}
          className="w-full"
          onClick={() => (window.location.href = "/chat")}
        >
          {cta}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
