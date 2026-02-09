import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Droplet, Heart, Shield, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Abstract Tech Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full filter blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-medical-blue/5 rounded-full filter blur-3xl opacity-50"></div>
      </div>

      <div className="container relative z-10 mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-medical-blue rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white dark:bg-slate-900 rounded-full p-6 ring-1 ring-gray-900/5 shadow-2xl">
                <Droplet className="h-16 w-16 text-primary animate-pulse" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-medical-blue pb-2">
            Blood Inventory Management
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            Next-generation hospital blood bank operations. <br />
            <span className="font-medium text-foreground">Secure. Real-time. Efficient.</span>
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 transform hover:-translate-y-1"
            onClick={() => navigate("/auth")}
          >
            Access Dashboard
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-20">
          <div className="glass-panel p-8 rounded-xl tech-border group hover:bg-white/90 dark:hover:bg-slate-800/90">
            <div className="bg-primary/10 rounded-2xl p-4 w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3 tracking-tight">Real-time Analytics</h3>
            <p className="text-muted-foreground leading-relaxed">
              Monitor blood inventory levels globally with sub-second latency updates across all departments.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-xl tech-border group hover:bg-white/90 dark:hover:bg-slate-800/90">
            <div className="bg-medical-red/10 rounded-2xl p-4 w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
              <Shield className="h-8 w-8 text-medical-red" />
            </div>
            <h3 className="text-xl font-bold mb-3 tracking-tight">HIPAA Compliant</h3>
            <p className="text-muted-foreground leading-relaxed">
              Enterprise-grade security with role-based access control and encrypted donor records.
            </p>
          </div>

          <div className="glass-panel p-8 rounded-xl tech-border group hover:bg-white/90 dark:hover:bg-slate-800/90">
            <div className="bg-success/10 rounded-2xl p-4 w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
              <Zap className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-bold mb-3 tracking-tight">Rapid Response</h3>
            <p className="text-muted-foreground leading-relaxed">
              Automated matching algorithms for urgent transfer requests within the network.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
