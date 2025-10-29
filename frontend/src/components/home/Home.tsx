import bleakaidemo from "@/assets/bleakaidemo.mp4";
import {ArrowRight} from "lucide-react";
import {Button} from "../ui/button";

export default function Home() {
  return (
    <div className="bg-background text-foreground mt-16">
      {/* Hero Section - Silent Edge: Confident, minimal, purposeful */}
      <section className="min-h-screen flex items-center justify-center">
        <div className="container-max text-center">
          {/* Brand - Large, confident typography */}
          <div className="mb-16">
            <div className="flex items-center justify-center">
              <h1 className="text-7xl sm:text-8xl md:text-9xl font-light tracking-tight mb-4 text-foreground">
                Bleak AI
              </h1>
            </div>
          </div>

          {/* Core Message - Clear hierarchy */}
          <div className="content-max space-y-8 mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-light leading-relaxed text-muted-foreground">
              Stop making users type everything.{" "}
            </h2>

            <p className="text-lg text-muted-foreground text-max leading-relaxed">
              Turn "please tell me about..." into date pickers, sliders, and
              dropdowns.
            </p>
          </div>

          {/* Primary Actions - Confident placement */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-24">
            <Button
              size="lg"
              className="px-8 py-4 text-base font-medium interactive-scale"
              onClick={() => (window.location.href = "/chat")}
            >
              Chat
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
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

      {/* Demo Video Section */}
      <section className="py-24 px-4 lg:px-16">
        <div className="container-max">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-foreground mb-4">
              See Bleak AI in Action
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Watch how Bleak AI transforms natural conversation into
              structured, interactive elements
            </p>
          </div>
          <div className="flex items-center justify-center">
            <div className="w-full max-w-5xl aspect-video">
              <video
                className="w-full h-full object-cover rounded-lg shadow-lg border border-border"
                controls
              >
                <source src={bleakaidemo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action - Strong, confident close */}
      <section className="py-32 px-4 lg:px-16 bg-muted/20">
        <div className="content-max text-center space-y-12">
          <div className="space-y-6">
            <h2 className="font-light tracking-tight text-foreground">
              Stop Parsing Messy Text
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed text-max">
              Get clean, structured data from the start. Build better AI
              experiences.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="px-8 py-4 text-base font-medium interactive-scale"
              onClick={() => (window.location.href = "/chat")}
            >
              Try Bleak AI Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
