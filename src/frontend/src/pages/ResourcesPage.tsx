import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Atom, BookOpen, Calculator, FlaskConical } from "lucide-react";
import SubjectView from "./SubjectView";

export default function ResourcesPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resources</h1>
          <p className="text-sm text-muted-foreground">
            Track your study materials across all subjects
          </p>
        </div>
      </div>

      <Tabs defaultValue="Physics" className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList
            className="flex flex-row gap-2 bg-transparent border-0 p-0 h-auto"
            data-ocid="resources.tab"
          >
            {/* Physics */}
            <TabsTrigger
              value="Physics"
              className="group relative flex flex-row items-center gap-2 py-2.5 px-5 rounded-xl border text-sm font-semibold transition-all duration-200
                bg-transparent border-transparent text-muted-foreground h-auto
                data-[state=active]:bg-sky-400/10 data-[state=active]:border-sky-400/50 data-[state=active]:text-sky-300
                data-[state=active]:shadow-[0_0_16px_oklch(0.72_0.15_200_/_0.15)]
                hover:border-sky-400/30 hover:bg-sky-400/5 hover:text-sky-300/80"
              data-ocid="resources.physics.tab"
            >
              <div
                className="w-7 h-7 rounded-lg bg-sky-400/10 border border-sky-400/20 flex items-center justify-center shrink-0
                group-data-[state=active]:bg-sky-400/20 group-data-[state=active]:border-sky-400/40 transition-all"
              >
                <Atom className="w-4 h-4 text-sky-400" />
              </div>
              <span>Physics</span>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-sky-400/0 group-data-[state=active]:bg-sky-400/70 transition-all" />
            </TabsTrigger>

            {/* Chemistry */}
            <TabsTrigger
              value="Chemistry"
              className="group relative flex flex-row items-center gap-2 py-2.5 px-5 rounded-xl border text-sm font-semibold transition-all duration-200
                bg-transparent border-transparent text-muted-foreground h-auto
                data-[state=active]:bg-violet-400/10 data-[state=active]:border-violet-400/50 data-[state=active]:text-violet-300
                data-[state=active]:shadow-[0_0_16px_oklch(0.55_0.18_300_/_0.15)]
                hover:border-violet-400/30 hover:bg-violet-400/5 hover:text-violet-300/80"
              data-ocid="resources.chemistry.tab"
            >
              <div
                className="w-7 h-7 rounded-lg bg-violet-400/10 border border-violet-400/20 flex items-center justify-center shrink-0
                group-data-[state=active]:bg-violet-400/20 group-data-[state=active]:border-violet-400/40 transition-all"
              >
                <FlaskConical className="w-4 h-4 text-violet-400" />
              </div>
              <span>Chemistry</span>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-violet-400/0 group-data-[state=active]:bg-violet-400/70 transition-all" />
            </TabsTrigger>

            {/* Maths */}
            <TabsTrigger
              value="Maths"
              className="group relative flex flex-row items-center gap-2 py-2.5 px-5 rounded-xl border text-sm font-semibold transition-all duration-200
                bg-transparent border-transparent text-muted-foreground h-auto
                data-[state=active]:bg-amber-400/10 data-[state=active]:border-amber-400/50 data-[state=active]:text-amber-300
                data-[state=active]:shadow-[0_0_16px_oklch(0.78_0.18_55_/_0.15)]
                hover:border-amber-400/30 hover:bg-amber-400/5 hover:text-amber-300/80"
              data-ocid="resources.maths.tab"
            >
              <div
                className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0
                group-data-[state=active]:bg-amber-400/20 group-data-[state=active]:border-amber-400/40 transition-all"
              >
                <Calculator className="w-4 h-4 text-amber-400" />
              </div>
              <span>Maths</span>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-amber-400/0 group-data-[state=active]:bg-amber-400/70 transition-all" />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="Physics">
          <SubjectView subject="Physics" />
        </TabsContent>
        <TabsContent value="Chemistry">
          <SubjectView subject="Chemistry" />
        </TabsContent>
        <TabsContent value="Maths">
          <SubjectView subject="Maths" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
